import * as XLSX from 'xlsx';

export interface DepartmentBulkData {
  code: string;
  name: string;
  head_of_department?: string;
  hod_email?: string;
  number_students?: number;
  number_faculty?: number;
}

export interface CourseBulkData {
  code: string;
  name: string;
  department_code?: string;
  duration_years?: number;
  credits_required?: number;
}

export interface UserBulkData {
  name: string;
  email: string;
  role: 'STUDENT' | 'FACULTY' | 'COLLEGE_ADMIN' | 'SUPERADMIN';
  department?: string;
  student_phone?: string;
  parent_phone?: string;
  sem?: number;
  blood_group?: string;
  batch?: string;
  program?: string;
  date_of_birth?: string;
  year?: number;
  section?: string;
  proctor_or_mentor?: string;
  gender?: string;
  student_id?: string;
  faculty_id?: string;
  password?: string;
}

// Download sample Excel file for departments
export const downloadDepartmentSample = () => {
  const sampleData = [
    {
      name: 'Computer Science Engineering',
      code: 'CSE',
      head_of_department: 'Dr. Ananya Rao',
      hod_email: 'ananya.rao@college.edu',
      number_students: 450,
      number_faculty: 25
    },
    {
      name: 'Electronics and Communication Engineering',
      code: 'ECE',
      head_of_department: 'Dr. Ravi Kumar',
      hod_email: 'ravi.kumar@college.edu',
      number_students: 380,
      number_faculty: 20
    },
    {
      name: 'Mechanical Engineering',
      code: 'ME',
      head_of_department: 'Dr. Priya Menon',
      hod_email: 'priya.menon@college.edu',
      number_students: 320,
      number_faculty: 18
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  worksheet['!cols'] = [{ wch: 40 }, { wch: 15 }, { wch: 28 }, { wch: 34 }, { wch: 15 }, { wch: 15 }];
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Departments');
  
  XLSX.writeFile(workbook, 'departments-sample.xlsx');
};

// Download sample Excel file for courses
export const downloadCourseSample = () => {
  const sampleData = [
    {
      code: 'BSCSE',
      name: 'Bachelor of Science in Computer Science',
      department_code: 'CSE',
      duration_years: 4,
      credits_required: 120
    },
    {
      code: 'BSIT',
      name: 'Bachelor of Science in Information Technology',
      department_code: 'CSE',
      duration_years: 4,
      credits_required: 120
    },
    {
      code: 'BSECE',
      name: 'Bachelor of Science in Electronics',
      department_code: 'ECE',
      duration_years: 4,
      credits_required: 120
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  worksheet['!cols'] = [
    { wch: 12 },
    { wch: 40 },
    { wch: 18 },
    { wch: 15 },
    { wch: 18 }
  ];
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Courses');
  
  XLSX.writeFile(workbook, 'courses-sample.xlsx');
};

// Download sample Excel file for users
export const downloadUserSample = () => {
  const sampleData = [
    {
      name: 'John Doe',
      email: 'john.doe@college.edu',
      role: 'STUDENT',
      department: 'Computer Science',
      student_phone: '+91-9876543210',
      parent_phone: '+91-9123456780',
      sem: 4,
      blood_group: 'O+',
      batch: '2023-2027',
      program: 'B.Tech CSE',
      date_of_birth: '2005-02-14',
      year: 2,
      section: 'A',
      proctor_or_mentor: 'Dr. Jane Smith',
      gender: 'Male',
      student_id: 'STU-2024-001',
      password: 'TempPass@123'
    },
    {
      name: 'Jane Smith',
      email: 'jane.smith@college.edu',
      role: 'FACULTY',
      department: 'Computer Science',
      student_phone: '',
      parent_phone: '',
      sem: 0,
      blood_group: 'A+',
      batch: '2015',
      program: 'Computer Science',
      date_of_birth: '1988-08-09',
      year: 0,
      section: '',
      proctor_or_mentor: 'Senior Mentor Group 1',
      gender: 'Female',
      faculty_id: 'FAC-001',
      password: 'TempPass@123'
    },
    {
      name: 'Vijay Kumar',
      email: 'angajalavijay8560@gmail.com',
      role: 'COLLEGE_ADMIN',
      student_phone: '',
      parent_phone: '',
      sem: 0,
      blood_group: '',
      batch: '',
      program: '',
      date_of_birth: '',
      year: 0,
      section: '',
      proctor_or_mentor: '',
      gender: 'Other',
      password: 'vijaykumar@123'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  worksheet['!cols'] = [
    { wch: 20 },
    { wch: 25 },
    { wch: 15 },
    { wch: 20 },
    { wch: 16 },
    { wch: 16 },
    { wch: 8 },
    { wch: 12 },
    { wch: 12 },
    { wch: 20 },
    { wch: 14 },
    { wch: 8 },
    { wch: 10 },
    { wch: 24 },
    { wch: 12 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 }
  ];
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');
  
  XLSX.writeFile(workbook, 'users-sample.xlsx');
};

// Parse Excel file and return data
export const parseExcelFile = (file: File, sheetName: string = 'Sheet1'): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get the first sheet if sheetName not found
        const sheet = workbook.Sheets[sheetName] || workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet);
        
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
};

// Validate department data
export const validateDepartmentData = (data: any[]): { valid: DepartmentBulkData[], errors: string[] } => {
  const valid: DepartmentBulkData[] = [];
  const errors: string[] = [];

  data.forEach((row, index) => {
    const rowNum = index + 2; // Excel row number (1-indexed header + 1)
    
    if (!row.code || !row.name) {
      errors.push(`Row ${rowNum}: Missing required fields (code and name)`);
      return;
    }

    if (typeof row.code !== 'string' || typeof row.name !== 'string') {
      errors.push(`Row ${rowNum}: Code and name must be text`);
      return;
    }

    valid.push({
      code: row.code.toString().toUpperCase().trim(),
      name: row.name.toString().trim(),
      head_of_department: row.head_of_department ? row.head_of_department.toString().trim() : undefined,
      hod_email: row.hod_email ? row.hod_email.toString().trim() : undefined,
    });
  });

  return { valid, errors };
};

// Validate course data
export const validateCourseData = (data: any[]): { valid: CourseBulkData[], errors: string[] } => {
  const valid: CourseBulkData[] = [];
  const errors: string[] = [];

  data.forEach((row, index) => {
    const rowNum = index + 2;
    
    if (!row.code || !row.name) {
      errors.push(`Row ${rowNum}: Missing required fields (code and name)`);
      return;
    }

    valid.push({
      code: row.code.toString().toUpperCase().trim(),
      name: row.name.toString().trim(),
      department_code: row.department_code ? row.department_code.toString().toUpperCase().trim() : undefined,
      duration_years: row.duration_years ? parseInt(row.duration_years) : 4,
      credits_required: row.credits_required ? parseInt(row.credits_required) : 120
    });
  });

  return { valid, errors };
};

// Validate user data
export const validateUserData = (data: any[]): { valid: UserBulkData[], errors: string[] } => {
  const valid: UserBulkData[] = [];
  const errors: string[] = [];

  data.forEach((row, index) => {
    const rowNum = index + 2;
    
    if (!row.name || !row.email || !row.role) {
      errors.push(`Row ${rowNum}: Missing required fields (name, email, role)`);
      return;
    }

    const normalizedRole = row.role?.toString().toUpperCase().trim()
      .replace('FACULLTY', 'FACULTY')
      .replace('FACULITY', 'FACULTY');

    const validRoles = ['STUDENT', 'FACULTY', 'COLLEGE_ADMIN', 'SUPERADMIN'];
    if (!validRoles.includes(normalizedRole)) {
      errors.push(`Row ${rowNum}: Invalid role '${row.role}'. Must be one of: ${validRoles.join(', ')}`);
      return;
    }

    valid.push({
      name: row.name.toString().trim(),
      email: row.email.toString().toLowerCase().trim(),
      role: normalizedRole as any,
      department: row.department ? row.department.toString().trim() : undefined,
      student_phone: row.student_phone ? row.student_phone.toString().trim() : undefined,
      parent_phone: row.parent_phone ? row.parent_phone.toString().trim() : undefined,
      sem: row.sem !== undefined && row.sem !== null && row.sem !== '' ? parseInt(row.sem) : undefined,
      blood_group: row.blood_group ? row.blood_group.toString().trim() : undefined,
      batch: row.batch ? row.batch.toString().trim() : undefined,
      program: row.program ? row.program.toString().trim() : undefined,
      date_of_birth: row.date_of_birth ? row.date_of_birth.toString().trim() : undefined,
      year: row.year !== undefined && row.year !== null && row.year !== '' ? parseInt(row.year) : undefined,
      section: row.section ? row.section.toString().trim() : undefined,
      proctor_or_mentor: row.proctor_or_mentor ? row.proctor_or_mentor.toString().trim() : undefined,
      gender: row.gender ? row.gender.toString().trim() : undefined,
      student_id: row.student_id ? row.student_id.toString().trim() : undefined,
      faculty_id: row.faculty_id ? row.faculty_id.toString().trim() : undefined,
      password: row.password ? row.password.toString() : 'TempPass@123'
    });
  });

  return { valid, errors };
};
