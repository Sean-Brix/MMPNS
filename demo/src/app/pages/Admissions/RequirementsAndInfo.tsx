import React from 'react';
import { FileText, CheckCircle, CreditCard, Download } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const RequirementsAndInfo: React.FC = () => {
  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Requirements */}
          <div className="bg-white p-10 rounded-3xl shadow-sm">
            <div className="flex items-center gap-4 mb-8">
              <FileText className="text-[#185C20]" size={32} />
              <h3 className="text-2xl font-bold">General Requirements</h3>
            </div>
            <ul className="space-y-4">
              {[
                'PSA Birth Certificate (Original & Photocopy)',
                'Recent Report Card (Form 138)',
                'Certificate of Good Moral Character',
                '2x2 ID Photos (4 copies)',
                'ECCD Checklist (for Kinder enrollees)',
                'ESC Certificate (for Junior High transfers)'
              ].map((item, idx) => (
                <li key={idx} className="flex items-center gap-3 text-gray-600">
                  <CheckCircle className="text-[#EDCD1F] shrink-0" size={18} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-10 p-6 bg-[#EDCD1F]/10 rounded-2xl">
              <p className="text-sm text-[#185C20] font-medium italic">
                * Note: Originals are for verification only and will be returned after the assessment process.
              </p>
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-white p-10 rounded-3xl shadow-sm">
            <div className="flex items-center gap-4 mb-8">
              <CreditCard className="text-[#185C20]" size={32} />
              <h3 className="text-2xl font-bold">Payment Information</h3>
            </div>
            <p className="text-gray-600 mb-8">
              Tuition and miscellaneous fees can be paid in full or through our flexible installment plans (Quarterly or Monthly).
            </p>
            <div className="space-y-6">
              <div className="p-6 border border-gray-100 rounded-2xl hover:border-[#EDCD1F] transition-colors">
                <div className="font-bold mb-1">Bank Transfer (BDO)</div>
                <div className="text-sm text-gray-500">Account Name: Madre Maria Pia Notari School Inc.</div>
                <div className="text-sm font-mono font-bold mt-1 text-[#185C20]">Acc No: 0012-3456-7890</div>
              </div>
              <div className="p-6 border border-gray-100 rounded-2xl hover:border-[#EDCD1F] transition-colors">
                <div className="font-bold mb-1">Over-the-Counter</div>
                <div className="text-sm text-gray-500">Visit our Finance Office from Monday to Friday, 8:00 AM to 4:00 PM.</div>
              </div>
            </div>
            <Button className="w-full mt-8" variant="outline">
              <Download className="mr-2" size={18} /> Download Fee Schedule
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
