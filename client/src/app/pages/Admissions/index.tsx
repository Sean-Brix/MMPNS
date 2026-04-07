import React from 'react';
import { AdmissionsHeader } from './AdmissionsHeader';
import { EnrollmentProcedure } from './EnrollmentProcedure';
import { RequirementsAndInfo } from './RequirementsAndInfo';
import { RegistrarContact } from './RegistrarContact';
import { AdmissionsFAQ } from './AdmissionsFAQ';

export const Admissions: React.FC = () => {
  return (
    <div className="bg-white">
      <AdmissionsHeader />
      <EnrollmentProcedure />
      <RequirementsAndInfo />
      <RegistrarContact />
      <AdmissionsFAQ />
    </div>
  );
};

export default Admissions;
