Teacher Portal – Grading System
Product Requirements Document (PRD)
1. Overview
The Teacher Portal Grading System is a feature of the school management website that allows teachers to compute, manage, and submit student grades per subject and quarter using a standardized grading template based on the provided Excel format.
The system digitizes the existing Excel grading sheet while maintaining the same computation logic and export format.
The portal supports:
• Dynamic grading templates
• Automatic grade computation
• Teacher-subject assignments
• Quarterly locking
• Analytics and reporting
2. Objectives
1. Replace manual Excel grading with a web-based grading portal.
2. Maintain the exact computation formula used in the Excel template.
3. Allow teachers flexibility in the number of graded activities.
4. Provide centralized analytics for school administrators.
5. Enable export of grades into Excel in the same template format.
3. School Structure
Year Levels:
Grade 6
Grade 7
Grade 8
Grade 9
Grade 10

Each level contains a list of enrolled students.
4. Subject Types
Major Subjects:
• Mathematics
• Science
• English
• Filipino

Weight Distribution:
Math & Science
Written Works – 20%
Performance Tasks – 40%
Quarterly Assessment – 20%

English & Filipino
Written Works – 20%
Performance Tasks – 50%
Quarterly Assessment – 20%

Minor Subjects:
Written Works – 20%
Performance Tasks – 60%
Quarterly Assessment – 20%
5. Grading Formula
Step 1 – Percentage Score
PS = (Student Score / Highest Possible Score) × 100

Step 2 – Average Score
Average_PS = Average of all PS values

Step 3 – Apply Weight
Weighted Score = Average_PS × Component Weight

Step 4 – Initial Grade
Initial Grade =
Weighted Written +
Weighted Performance +
Weighted Quarterly

Step 5 – Transmuted Grade
Initial grade will be converted using the DepEd transmutation table.
6. Teacher Dashboard
Teachers can view:
• Assigned subjects
• Assigned year level
• Quarter progress
• Grading completion status
7. Subject Assignment
The principal/admin assigns subjects to teachers.

Example:
Teacher: Mr. Santos
Subject: ICT
Grade Level: Grade 7

A teacher may handle multiple subjects and year levels.
8. Dynamic Grading Template
Teachers can dynamically add or remove:
• Written Works
• Performance Tasks
• Quarterly Assessments

If multiple activities exist, the weight is distributed equally.

Example:
Written Works Weight = 20%
If 4 activities exist → each activity weight = 5%
9. Student Management
Teachers can manually add students.

Fields:
Student ID
Name
Gender
Year Level
10. Quarter Management
There are four quarters per school year.

The principal sets:
• Start date
• End date
• Submission deadline

When a quarter ends, grades become locked and cannot be edited.
11. Grade Encoding Interface
The interface mirrors the Excel sheet format.

Columns include:
Student Name
Written Works Scores
Performance Task Scores
Exam Score
Initial Grade
Final Grade

All calculations are automatic.
12. Excel Export
Teachers can export their grading sheets in .xlsx format using the same layout as the original Excel template.
13. Analytics and Statistics
Teachers can view:
• Class average
• Highest grade
• Lowest grade
• Pass/Fail rate

Charts:
• Grade distribution
• Performance trends
14. Principal Analytics
Admin dashboard provides:
• Average grade per subject
• Average grade per year level
• Top performing students
• Lowest performing classes

Risk Detection:
• Students below passing grade
• Subjects with poor performance
15. Roles and Permissions
Teacher Permissions:
• View assigned subjects
• Encode grades
• Add/remove activities
• Add students
• Export Excel

Admin Permissions:
• Assign subjects
• Manage teachers
• Set quarter schedule
• Unlock grades
• View analytics
16. Suggested Database Structure
Teachers
teacher_id
name
email
password
role

Students
student_id
name
gender
year_level

Subjects
subject_id
subject_name
subject_type
performance_weight
written_weight
exam_weight

Teacher_Subject_Assignment
id
teacher_id
subject_id
year_level
school_year

Quarters
quarter_id
school_year
quarter_number
start_date
end_date
is_locked

Activities
activity_id
subject_id
quarter_id
type
title
max_score

Grades
grade_id
student_id
activity_id
score

Final_Grades
student_id
subject_id
quarter_id
initial_grade
final_grade