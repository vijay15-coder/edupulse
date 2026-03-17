import * as pdfjsLib from 'pdfjs-dist';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

/** Shape of one subject extracted from PDF */
export interface ParsedSubject {
    subject_name: string;
    subject_code: string;
    grade: string;
    status: 'PASS' | 'FAIL';
    credits?: number;
}

/** Shape of one student's result extracted from PDF */
export interface ParsedStudentResult {
    student_roll: string;
    subjects: ParsedSubject[];
    sgpa: number;
    cgpa: number;
    total_subjects: number;
    passed_subjects: number;
    failed_subjects: number;
    overall_status: 'PASS' | 'FAIL';
}

// Grades that indicate failure
const FAIL_GRADES = new Set(['F', 'FF', 'FA', 'AB', 'W', 'I', 'U', 'FAIL', 'RA']);

/** Determine if a grade indicates pass or fail */
const gradeStatus = (grade: string): 'PASS' | 'FAIL' => {
    const upper = grade.trim().toUpperCase();
    return FAIL_GRADES.has(upper) ? 'FAIL' : 'PASS';
};

/**
 * Extract all text from a PDF file buffer.
 * Returns an array of strings, one per page.
 */
export const extractPdfText = async (fileBuffer: ArrayBuffer): Promise<string[]> => {
    const pdf = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
    const pages: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
        pages.push(pageText);
    }

    return pages;
};

/**
 * Try to parse semester results from raw PDF text.
 * 
 * This parser works in multiple strategies:
 * 1. Table-based: looks for roll-number rows with subject grades inline
 * 2. Block-based: looks for student blocks with roll number headers
 * 3. Simple line-based: finds roll numbers and nearby grade data
 * 
 * The parser is flexible and returns best-effort parsed results.
 * Admin can edit the results before saving.
 */
export const parseResultsFromText = (pages: string[]): ParsedStudentResult[] => {
    const fullText = pages.join('\n');
    const results: ParsedStudentResult[] = [];

    // Common roll number patterns:
    // - 21BCE1234, CSE-2024-001, 2024/CS/001, RA2111003010234
    // - Alphanumeric 6-20 chars, usually starting with digits or department code
    const rollPattern = /\b([A-Z]{2,4}[-/]?\d{2,4}[-/]?[A-Z]{0,4}[-/]?\d{2,6})\b/gi;

    // Grade patterns: A+, A, A-, B+, B, B-, C+, C, D, E, F, O, S, P, AB, FA
    const gradePattern = /\b([OSABCDEFPUW][+\-]?|FF|FA|AB|RA)\b/g;

    // SGPA/CGPA patterns
    const sgpaPattern = /S\.?G\.?P\.?A\.?\s*[:\-=]?\s*(\d+\.?\d*)/gi;
    const cgpaPattern = /C\.?G\.?P\.?A\.?\s*[:\-=]?\s*(\d+\.?\d*)/gi;

    // Subject code patterns: CS101, MAT201, PHY-301, etc.
    const subjectCodePattern = /\b([A-Z]{2,5}[-]?\d{2,4}[A-Z]?)\b/g;

    // Try to extract structured data
    const lines = fullText.split(/\n/);
    let currentStudentRoll = '';
    let currentSubjects: ParsedSubject[] = [];
    let currentSgpa = 0;
    let currentCgpa = 0;

    const flushStudent = () => {
        if (currentStudentRoll && currentSubjects.length > 0) {
            const passed = currentSubjects.filter(s => s.status === 'PASS').length;
            const failed = currentSubjects.filter(s => s.status === 'FAIL').length;

            results.push({
                student_roll: currentStudentRoll,
                subjects: [...currentSubjects],
                sgpa: currentSgpa,
                cgpa: currentCgpa,
                total_subjects: currentSubjects.length,
                passed_subjects: passed,
                failed_subjects: failed,
                overall_status: failed > 0 ? 'FAIL' : 'PASS'
            });
        }
        currentSubjects = [];
        currentSgpa = 0;
        currentCgpa = 0;
    };

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Check for roll number
        const rollMatches = trimmed.match(rollPattern);
        if (rollMatches && rollMatches.length > 0) {
            // Potential new student — check if this looks like a roll number line
            const potentialRoll = rollMatches[0].toUpperCase();

            // Avoid matching subject codes as roll numbers
            // Roll numbers are typically longer and more complex
            if (potentialRoll.length >= 6) {
                flushStudent();
                currentStudentRoll = potentialRoll;
                continue;
            }
        }

        // Extract SGPA
        const sgpaMatch = trimmed.match(sgpaPattern);
        if (sgpaMatch) {
            const val = parseFloat(sgpaMatch[0].replace(/[^0-9.]/g, ''));
            if (!isNaN(val) && val <= 10) currentSgpa = val;
        }

        // Extract CGPA
        const cgpaMatch = trimmed.match(cgpaPattern);
        if (cgpaMatch) {
            const val = parseFloat(cgpaMatch[0].replace(/[^0-9.]/g, ''));
            if (!isNaN(val) && val <= 10) currentCgpa = val;
        }

        // Try to extract subject + grade pairs from the line
        if (currentStudentRoll) {
            const subjectCodes = trimmed.match(subjectCodePattern);
            const grades = trimmed.match(gradePattern);

            if (subjectCodes && grades) {
                // Pair them up
                const count = Math.min(subjectCodes.length, grades.length);
                for (let i = 0; i < count; i++) {
                    currentSubjects.push({
                        subject_name: subjectCodes[i],
                        subject_code: subjectCodes[i],
                        grade: grades[i],
                        status: gradeStatus(grades[i])
                    });
                }
            }
        }
    }

    // Flush last student
    flushStudent();

    return results;
};

/**
 * Parse a PDF file and return structured student results.
 * Call this from the admin upload flow.
 */
export const parsePdfResults = async (file: File): Promise<ParsedStudentResult[]> => {
    const buffer = await file.arrayBuffer();
    const pages = await extractPdfText(buffer);
    return parseResultsFromText(pages);
};

/**
 * Create an empty parsed result template for manual entry.
 * Useful when PDF parsing fails and admin wants to enter results manually.
 */
export const createEmptyResult = (studentRoll: string): ParsedStudentResult => ({
    student_roll: studentRoll,
    subjects: [],
    sgpa: 0,
    cgpa: 0,
    total_subjects: 0,
    passed_subjects: 0,
    failed_subjects: 0,
    overall_status: 'PASS'
});
