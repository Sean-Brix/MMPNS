import {
  AlignmentType,
  Document,
  HeightRule,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
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
  emergencyContactName?: string;
  emergencyContactNumber?: string;
  photoUrl?: string;
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
const ROWS_PER_PAGE = LABELS_PER_PAGE / 2;
const HEADER_ALLOWANCE_DXA = 400;
// Stretch every row so the full grid always fills the printable page height,
// instead of Word shrinking the table to its content and leaving blank paper below it.
const ROW_HEIGHT_DXA = Math.floor(
  (PAGE_HEIGHT_DXA - (PAGE_MARGIN_DXA * 2) - HEADER_ALLOWANCE_DXA) / ROWS_PER_PAGE,
);
const PHOTO_CELL_WIDTH_DXA = 1450;
const PHOTO_IMAGE_PX = 88;

const dataUrlToBytes = async (dataUrl: string) =>
  new Uint8Array(await (await fetch(dataUrl)).arrayBuffer());

const fetchStudentPhotoBytes = async (photoUrl: string, label: string): Promise<Uint8Array | null> => {
  const warn = (reason: string) => console.warn(`[ID export] Could not embed photo for ${label}: ${reason}`, photoUrl);

  let response: Response;
  try {
    // Firebase Storage sends Access-Control-Allow-Origin on a fresh 200, but
    // browsers that already cached this URL (e.g. from the <img> thumbnail
    // elsewhere in the UI) send a conditional request and get back a 304
    // that omits the CORS header, which fetch() then rejects. Force a full
    // network fetch so we always get the header-bearing 200 response.
    response = await fetch(photoUrl, { mode: 'cors', cache: 'no-store' });
  } catch (error) {
    warn(`network/CORS error — ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
  if (!response.ok) {
    warn(`HTTP ${response.status} ${response.statusText}`);
    return null;
  }

  const blob = await response.blob();
  if (typeof createImageBitmap !== 'function') {
    warn('createImageBitmap is not supported in this browser');
    return null;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(blob);
  } catch (error) {
    warn(`could not decode image (type: ${blob.type || 'unknown'}) — ${error instanceof Error ? error.message : String(error)}. HEIC/HEIF photos from iPhones are a common cause; re-save as JPG or PNG.`);
    return null;
  }

  const size = 240;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    warn('canvas 2D context unavailable');
    return null;
  }

  const scale = Math.max(size / bitmap.width, size / bitmap.height);
  const drawWidth = bitmap.width * scale;
  const drawHeight = bitmap.height * scale;
  ctx.drawImage(bitmap, (size - drawWidth) / 2, (size - drawHeight) / 2, drawWidth, drawHeight);

  try {
    return await dataUrlToBytes(canvas.toDataURL('image/png'));
  } catch (error) {
    warn(`could not export canvas — ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
};

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

const labelColumnWidths = (codeType: StudentCodeType, includePhotos: boolean) => {
  const codeCellWidth = codeType === 'qr' ? 1500 : 2300;
  const detailCellWidth = LABEL_WIDTH_DXA - codeCellWidth - (includePhotos ? PHOTO_CELL_WIDTH_DXA : 0);
  return includePhotos
    ? [PHOTO_CELL_WIDTH_DXA, codeCellWidth, detailCellWidth]
    : [codeCellWidth, detailCellWidth];
};

const createLabelCells = async (
  student: StudentCodeRecord | undefined,
  codeType: StudentCodeType,
  includePhotos: boolean,
) => {
  const columnWidths = labelColumnWidths(codeType, includePhotos);
  const codeCellWidth = columnWidths[columnWidths.length - 2];
  const detailCellWidth = columnWidths[columnWidths.length - 1];

  const photoCell = includePhotos
    ? new TableCell({
      width: { size: PHOTO_CELL_WIDTH_DXA, type: WidthType.DXA },
      verticalAlign: VerticalAlign.CENTER,
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [] })],
    })
    : null;

  if (!student) {
    return [
      ...(photoCell ? [photoCell] : []),
      new TableCell({
        width: { size: codeCellWidth, type: WidthType.DXA },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph('')],
      }),
      new TableCell({
        width: { size: detailCellWidth, type: WidthType.DXA },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph('')],
      }),
    ];
  }

  const [image, photoBytes] = await Promise.all([
    createCodeImage(student, codeType),
    includePhotos && student.photoUrl ? fetchStudentPhotoBytes(student.photoUrl, student.displayName) : Promise.resolve(null),
  ]);
  const imageWidth = codeType === 'qr' ? 86 : 142;
  const imageHeight = codeType === 'qr' ? 86 : 50;

  const studentPhotoCell = includePhotos
    ? new TableCell({
      width: { size: PHOTO_CELL_WIDTH_DXA, type: WidthType.DXA },
      verticalAlign: VerticalAlign.CENTER,
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 0 },
          children: photoBytes
            ? [
              new ImageRun({
                type: 'png',
                data: photoBytes,
                transformation: { width: PHOTO_IMAGE_PX, height: PHOTO_IMAGE_PX },
              }),
            ]
            : [],
        }),
      ],
    })
    : null;

  return [
    ...(studentPhotoCell ? [studentPhotoCell] : []),
    new TableCell({
      width: { size: codeCellWidth, type: WidthType.DXA },
      verticalAlign: VerticalAlign.CENTER,
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
      verticalAlign: VerticalAlign.CENTER,
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
          spacing: { before: 0, after: 20 },
          children: [
            new TextRun({
              text: `ID: ${student.systemId}${student.lrn ? ` | LRN: ${student.lrn}` : ''}`,
              font: 'Calibri',
              size: 13,
              color: '666666',
            }),
          ],
        }),
        new Paragraph({
          spacing: { before: 0, after: 0 },
          children: [
            new TextRun({
              text: student.emergencyContactName || student.emergencyContactNumber
                ? `ICE: ${[student.emergencyContactName, student.emergencyContactNumber].filter(Boolean).join(' - ')}`
                : 'ICE: Not on file',
              font: 'Calibri',
              size: 12,
              color: '888888',
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

  const includePhotos = students.some((student) => student.photoUrl);
  const pageChunks = chunkStudents(students);
  const sections = await Promise.all(pageChunks.map(async (pageStudents) => {
    const rows: TableRow[] = [];
    for (let row = 0; row < ROWS_PER_PAGE; row += 1) {
      const leftCells = await createLabelCells(pageStudents[row * 2], options.codeType, includePhotos);
      const rightCells = await createLabelCells(pageStudents[row * 2 + 1], options.codeType, includePhotos);
      rows.push(new TableRow({
        height: { value: ROW_HEIGHT_DXA, rule: HeightRule.ATLEAST },
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
          columnWidths: [
            ...labelColumnWidths(options.codeType, includePhotos),
            ...labelColumnWidths(options.codeType, includePhotos),
          ],
          rows,
        }),
      ],
    };
  }));

  const doc = new Document({
    creator: 'MMPNS Multi-Role Portal',
    title: `MMPNS Student ${options.codeType === 'qr' ? 'QR Codes' : 'Barcodes'}`,
    description: 'Compact student ID code sheet generated by the MMPNS multi-role portal.',
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
