'use client';

import Barcode from 'react-barcode';
import { format } from 'date-fns';

interface ChallanProps {
    invoice: any;
    student: any;
    schoolName: string;
    schoolAddress?: string;
}

const ChallanCopy = ({ title, invoice, student, schoolName, schoolAddress }: { title: string } & ChallanProps) => {
    const billingDate = format(new Date(invoice.year, invoice.month - 1), 'MMMM yyyy');
    const total = Number(invoice.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    const items = Array.isArray(invoice.items) ? invoice.items : [];
    const normalizedRows = items.map((item: any, index: number) => ({
        key: item.id || `${item.feeHeadId || 'item'}-${index}`,
        sr: index + 1,
        name: item.feeHead?.name || 'Fee Head',
        amount: Number(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
    }));
    while (normalizedRows.length < 11) {
        normalizedRows.push({
            key: `blank-${normalizedRows.length}`,
            sr: normalizedRows.length + 1,
            name: '',
            amount: '',
        });
    }

    const guardianName =
        student?.fatherName ||
        student?.studentRecord?.fatherName ||
        student?.studentRecord?.parents?.find((p: any) => p.relationship === 'FATHER')?.parentRecord?.user?.name ||
        student?.studentRecord?.parents?.[0]?.parentRecord?.user?.name ||
        '-';

    return (
        <div className="challan-copy relative border border-black bg-white text-black text-[11px] leading-tight flex h-full flex-col">
            <div className="border-b border-black px-1.5 py-1 text-center">
                <p className="font-bold text-[11px]">{schoolName}</p>
                <p className="text-[9px]">{schoolAddress || 'Officer Colony Faisalabad Road Sargodha'}</p>
                <p className="font-bold text-[10px] mt-1">Bank Al-Habib</p>
                <p className="text-[9px]">Queens Road Branch Sargodha</p>
                <p className="text-[9px]">Acc. No:0284-0981-008444-01-9</p>
                <p className="font-bold text-[10px] mt-1">{title} Copy</p>
            </div>

            <div className="grid grid-cols-2 border-b border-black">
                <div className="px-1 py-1 border-r border-black"><span className="font-semibold">Slip No.</span> <span className="ml-1">{invoice.invoiceNo?.slice(-10) || '-'}</span></div>
                <div className="px-1 py-1"><span className="font-semibold">Roll No.</span> <span className="ml-1">{student.studentRecord?.rollNumber || student.studentRecord?.admissionNumber || 'N/A'}</span></div>
            </div>

            <div className="grid grid-cols-2 border-b border-black">
                <div className="px-1 py-1 border-r border-black"><span className="font-semibold">Name</span> <span className="ml-1">{student.name}</span></div>
                <div className="px-1 py-1"><span className="font-semibold">S/O, D/O</span> <span className="ml-1">{guardianName}</span></div>
            </div>
            <div className="grid grid-cols-2 border-b border-black">
                <div className="px-1 py-1 border-r border-black"><span className="font-semibold">Class</span> <span className="ml-1">{student.studentRecord?.myClass?.name || 'N/A'}</span></div>
                <div className="px-1 py-1"><span className="font-semibold">Section</span> <span className="ml-1">{student.studentRecord?.section?.name || 'A'}</span></div>
            </div>
            <div className="grid grid-cols-2 border-b border-black">
                <div className="px-1 py-1 border-r border-black"><span className="font-semibold">Month</span> <span className="ml-1">{billingDate}</span></div>
                <div className="px-1 py-1"><span className="font-semibold">Due Date</span> <span className="ml-1">{format(new Date(invoice.dueDate), 'dd-MMM-yyyy')}</span></div>
            </div>

            <table className="w-full text-[10px] relative z-10 border-collapse">
                <thead>
                    <tr className="border-b border-black">
                        <th className="py-1 px-1 text-center w-8 border-r border-black">Sr.</th>
                        <th className="py-1 px-1 text-left border-r border-black">Particulars</th>
                        <th className="py-1 px-1 text-right w-20">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {normalizedRows.map((row) => (
                        <tr key={row.key} className="border-b border-black/50">
                            <td className="py-1 px-1 text-center border-r border-black">{row.sr}</td>
                            <td className="py-1 px-1 border-r border-black">{row.name}</td>
                            <td className="text-right py-1 px-1">{row.amount}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="font-bold border-t border-black">
                        <td colSpan={2} className="py-1 px-1 border-r border-black">Total Payable (within due date)</td>
                        <td className="text-right py-1 px-1">{total}</td>
                    </tr>
                </tfoot>
            </table>

            <img
                src="/logo/logo.png"
                alt=""
                aria-hidden="true"
                className="absolute inset-0 m-auto mt-40 h-60 w-60 object-contain opacity-[0.5] pointer-events-none"
            />

            <div className="border-t border-black p-2 space-y-1">
                <div className="text-[9px] leading-tight space-y-0.5">
                    <p>* A fine of 5% of fees will be charged after due date.</p>
                    <p>* A surcharge will be levied after due date.</p>
                    <p>* This FeeSlip Will Be Expire On20th Of each Month</p>
                </div>
                <div className="text-center pt-1">
                    <Barcode 
                        value={invoice.invoiceNo} 
                        width={0.95}
                        height={24}
                        fontSize={7}
                        displayValue={true} 
                        margin={0}
                    />
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="text-center border-t border-black pt-1 text-[9px]">Depositor</div>
                    <div className="text-center border-t border-black pt-1 text-[9px]">Officer</div>
                </div>
            </div>
        </div>
    );
};

export default function PrintableChallan({ invoice, student, schoolName, schoolAddress }: ChallanProps) {
    if (!invoice || !student) return null;

    return (
        <div className="challan-sheet w-full bg-white">
            <div className="challan-sheet-grid grid h-full grid-cols-3 gap-[2px]">
                <ChallanCopy title="Bank" invoice={invoice} student={student} schoolName={schoolName} schoolAddress={schoolAddress} />
                <ChallanCopy title="School" invoice={invoice} student={student} schoolName={schoolName} schoolAddress={schoolAddress} />
                <ChallanCopy title="Student" invoice={invoice} student={student} schoolName={schoolName} schoolAddress={schoolAddress} />
            </div>
        </div>
    );
}