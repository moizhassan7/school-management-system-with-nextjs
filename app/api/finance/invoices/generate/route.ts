import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// Helper to calculate discount amount
function calculateDiscount(originalAmount: number, discount: any) {
    if (!discount) return 0;
    if (discount.type === 'PERCENTAGE') {
        return (originalAmount * Number(discount.value)) / 100;
    }
    return Number(discount.value); // Flat amount
}

export async function POST(request: Request) {
    try {
        const session = await auth();
        const role = session?.user?.role;
        const sessionSchoolId = session?.user?.schoolId;
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!['ACCOUNTANT', 'SUPER_ADMIN'].includes(String(role))) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        const body = await request.json();
        const { schoolId, classId, month, year, dueDate } = body;
        if (role !== 'SUPER_ADMIN' && schoolId !== sessionSchoolId) {
            return NextResponse.json({ error: 'Invalid school' }, { status: 403 });
        }

        // 1. Validation
        if (!schoolId || !classId || !month || !year || !dueDate) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 2. Fetch class default fee structure (fallback when student snapshot does not exist)
        const classFeeStructures = await prisma.feeStructure.findMany({
            where: { classId },
            include: { feeHead: true }
        });

        if (classFeeStructures.length === 0) {
            return NextResponse.json({ error: "No fee structure defined for this class" }, { status: 400 });
        }

        // 3. Fetch Active Students in Class (with their discounts)
        const students = await prisma.studentRecord.findMany({
            where: { 
                classId: classId,
                // Add logic here to exclude graduated/left students if you have a status field
            },
            include: {
                feeStructure: {
                    include: {
                        items: true,
                    },
                },
                user: {
                    include: {
                        // We need the reverse relation `studentDiscounts` in User model. 
                        // Ensure you ran `npx prisma generate` after updating schema.
                        // @ts-ignore
                        studentDiscounts: {
                            include: { discount: true }
                        }
                    }
                }
            }
        });

        if (students.length === 0) {
            return NextResponse.json({ error: "No students found in this class" }, { status: 400 });
        }

        // 4. Check if invoices already exist for this period (Prevent Duplicates)
        const existingCount = await prisma.invoice.count({
            where: {
                schoolId,
                month: parseInt(month),
                year: parseInt(year),
                studentId: { in: students.map(s => s.userId) }
            }
        });

        if (existingCount > 0) {
            return NextResponse.json({ 
                error: `Invoices for ${month}/${year} already exist for some students in this class.` 
            }, { status: 409 });
        }

        // 5. Prepare Bulk Transactions
        const invoiceOperations = students.map(record => {
            const student = record.user;
            
            // Calculate Items & Discounts for this specific student
            const sourceFeeItems = record.feeStructure?.items?.length
                ? record.feeStructure.items.map((item) => ({
                    feeHeadId: item.feeHeadId,
                    amount: Number(item.amount),
                }))
                : classFeeStructures.map((item) => ({
                    feeHeadId: item.feeHeadId,
                    amount: Number(item.amount),
                }));

            const invoiceItemsData = sourceFeeItems.map((sourceItem) => {
                const originalAmount = Number(sourceItem.amount);
                
                // Find matching discount for this Fee Head
                // @ts-ignore
                const activeDiscount = student.studentDiscounts.find(
                    (sd: any) => sd.discount.feeHeadId === sourceItem.feeHeadId
                );

                const discountVal = activeDiscount 
                    ? calculateDiscount(originalAmount, activeDiscount.discount) 
                    : 0;

                // Ensure we don't discount below zero
                const finalDiscount = Math.min(discountVal, originalAmount);
                const finalAmount = originalAmount - finalDiscount;

                return {
                    feeHeadId: sourceItem.feeHeadId,
                    originalAmount,
                    discountAmount: finalDiscount,
                    amount: finalAmount
                };
            });

            // Calculate Total Invoice Amount
            const totalAmount = invoiceItemsData.reduce((sum, item) => sum + item.amount, 0);

            // Generate Invoice Number (e.g., INV-2024-10-STUDENTID)
            // Ideally use a sequence table, but this is safe for now
            const invoiceNo = `INV-${year}${month.toString().padStart(2, '0')}-${record.admissionNumber}`;

            return prisma.invoice.create({
                data: {
                    schoolId,
                    studentId: student.id,
                    invoiceNo,
                    month: parseInt(month),
                    year: parseInt(year),
                    dueDate: new Date(dueDate),
                    totalAmount,
                    status: 'UNPAID',
                    items: {
                        create: invoiceItemsData.map(item => ({
                            feeHeadId: item.feeHeadId,
                            originalAmount: item.originalAmount,
                            discountAmount: item.discountAmount,
                            amount: item.amount
                        }))
                    }
                }
            });
        });

        // 6. Execute Transaction
        await prisma.$transaction(invoiceOperations);

        return NextResponse.json({ 
            success: true, 
            message: `Successfully generated ${invoiceOperations.length} invoices.` 
        });

    } catch (error) {
        console.error("Generation Failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
