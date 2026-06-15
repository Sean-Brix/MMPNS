import {
  AlignmentType,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';

export type StudentCodeType = 'qr' | 'barcode';

export interface StudentCodeRecord {
  uid: string;
  displayName: string;
  systemId?: string;
  studentCode?: string;
  gradeLevel?: string;
  section?: string;
  lrn?: string;
}

export interface StudentCodeDocumentOptions {
  students: StudentCodeRecord[];
  codeType: StudentCodeType;
  gradeLevel?: string;
  section?: string;
}

const PAGE_WIDTH_DXA = 12240;
const PAGE_HEIGHT_DXA = 15840;
const PAGE_MARGIN_DXA = 504;
const TABLE_WIDTH_DXA = PAGE_WIDTH_DXA - (PAGE_MARGIN_DXA * 2) - 240;
const LABEL_WIDTH_DXA = TABLE_WIDTH_DXA / 2;
const LABELS_PER_PAGE = 20;

const dataUrlToBytes = async (dataUrl: string) =>
  new Uint8Array(await (await fetch(dataUrl)).arrayBuffer());

const createCodeImage = async (student: StudentCodeRecord, codeType: StudentCodeType) => {
  if (!student.systemId) {
    throw new Error(`${student.displayName} does not have a system ID.`);
  }

  if (codeType === 'qr') {
    const dataUrl = await QRCode.toDataURL(student.systemId, {
      width: 320,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#111111', light: '#FFFFFF' },
    });
    return dataUrlToBytes(dataUrl);
  }

  const canvas = document.createElement('canvas');
  JsBarcode(canvas, student.systemId, {
    format: 'CODE128',
    lineColor: '#111111',
    width: 2,
    height: 72,
    displayValue: true,
    fontSize: 13,
    margin: 8,
    background: '#FFFFFF',
  });
  return dataUrlToBytes(canvas.toDataURL('image/png'));
};

const createLabelCells = async (
  student: StudentCodeRecord | undefined,
  codeType: StudentCodeType,
) => {
  const codeCellWidth = codeType === 'qr' ? 1500 : 2300;
  const detailCellWidth = LABEL_WIDTH_DXA - codeCellWidth;

  if (!student) {
    return [
      new TableCell({
        width: { size: codeCellWidth, type: WidthType.DXA },
        children: [new Paragraph('')],
      }),
      new TableCell({
        width: { size: detailCellWidth, type: WidthType.DXA },
        children: [new Paragraph('')],
      }),
    ];
  }

  const image = await createCodeImage(student, codeType);
  const imageWidth = codeType === 'qr' ? 86 : 142;
  const imageHeight = codeType === 'qr' ? 86 : 50;

  return [
    new TableCell({
      width: { size: codeCellWidth, type: WidthType.DXA },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 0 },
          children: [
            new ImageRun({
              type: 'png',
              data: image,
              transformation: { width: imageWidth, height: imageHeight },
            }),
          ],
        }),
      ],
    }),
    new TableCell({
      width: { size: detailCellWidth, type: WidthType.DXA },
      children: [
        new Paragraph({
          spacing: { before: 0, after: 35 },
          children: [
            new TextRun({
              text: student.displayName,
              bold: true,
              font: 'Calibri',
              size: 19,
              color: '111111',
            }),
          ],
        }),
        new Paragraph({
          spacing: { before: 0, after: 20 },
          children: [
            new TextRun({
              text: [student.gradeLevel, student.section].filter(Boolean).join(' - ') || 'Grade / section unassigned',
              font: 'Calibri',
              size: 15,
              color: '555555',
            }),
          ],
        }),
        new Paragraph({
          spacing: { before: 0, after: 0 },
          children: [
            new TextRun({
              text: `ID: ${student.systemId}`,
              font: 'Calibri',
              size: 13,
              color: '666666',
            }),
          ],
        }),
      ],
    }),
  ];
};

const chunkStudents = (students: StudentCodeRecord[]) => {
  const pages: StudentCodeRecord[][] = [];
  for (let index = 0; index < students.length; index += LABELS_PER_PAGE) {
    pages.push(students.slice(index, index + LABELS_PER_PAGE));
  }
  return pages;
};

const buildFileName = (options: StudentCodeDocumentOptions) => {
  const parts = [
    'mmpns',
    options.codeType === 'qr' ? 'qr-codes' : 'barcodes',
    options.gradeLevel,
    options.section,
  ].filter(Boolean);
  return `${parts.join('-').replace(/\s+/g, '-').toLowerCase()}.docx`;
};

export const buildStudentCodeDocument = async (options: StudentCodeDocumentOptions) => {
  const students = options.students.filter((student) => student.systemId);
  if (students.length === 0) {
    throw new Error('No students with system IDs match the selected filters.');
  }

  const pageChunks = chunkStudents(students);
  const sections = await Promise.all(pageChunks.map(async (pageStudents) => {
    const rows: TableRow[] = [];
    for (let index = 0; index < pageStudents.length; index += 2) {
      const leftCells = await createLabelCells(pageStudents[index], options.codeType);
      const rightCells = await createLabelCells(pageStudents[index + 1], options.codeType);
      rows.push(new TableRow({
        children: [...leftCells, ...rightCells],
      }));
    }

    const filterLabel = [
      options.gradeLevel || 'All grade levels',
      options.section || 'All sections',
    ].join(' | ');

    return {
      properties: {
        page: {
          size: {
            width: PAGE_WIDTH_DXA,
            height: PAGE_HEIGHT_DXA,
          },
          margin: {
            top: PAGE_MARGIN_DXA,
            right: PAGE_MARGIN_DXA,
            bottom: PAGE_MARGIN_DXA,
            left: PAGE_MARGIN_DXA,
          },
        },
      },
      children: [
        new Paragraph({
          spacing: { before: 0, after: 70 },
          children: [
            new TextRun({
              text: `MMPNS Student ID ${options.codeType === 'qr' ? 'QR Codes' : 'Barcodes'} | ${filterLabel}`,
              font: 'Calibri',
              size: 15,
              color: '555555',
            }),
          ],
        }),
        new Table({
          width: { size: TABLE_WIDTH_DXA, type: WidthType.DXA },
          layout: TableLayoutType.FIXED,
          columnWidths: options.codeType === 'qr'
            ? [1500, LABEL_WIDTH_DXA - 1500, 1500, LABEL_WIDTH_DXA - 1500]
            : [2300, LABEL_WIDTH_DXA - 2300, 2300, LABEL_WIDTH_DXA - 2300],
          rows,
        }),
      ],
    };
  }));

  const doc = new Document({
    creator: 'MMPNS Registrar',
    title: `MMPNS Student ${options.codeType === 'qr' ? 'QR Codes' : 'Barcodes'}`,
    description: 'Compact student ID code sheet generated by the MMPNS registrar portal.',
    sections,
  });

  return {
    blob: await Packer.toBlob(doc),
    fileName: buildFileName(options),
  };
};

export const downloadStudentCodeDocument = async (options: StudentCodeDocumentOptions) => {
  const { blob, fileName } = await buildStudentCodeDocument(options);
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
