import { PDFDocument, type PDFFont, StandardFonts } from 'pdf-lib';
import { PdfFinalizationProcessor } from './pdf-finalization.processor';

type RenderFieldFn = (
  pdf: PDFDocument,
  field: Record<string, unknown>,
  value: unknown,
  textFont: PDFFont,
  signatureFont: PDFFont,
) => void;

describe('PdfFinalizationProcessor field rendering', () => {
  async function render(field: Record<string, unknown>, value: unknown) {
    const pdf = await PDFDocument.create();
    pdf.addPage([600, 800]);
    const original = await pdf.save();
    const textFont = await pdf.embedFont(StandardFonts.Helvetica);
    const signatureFont = await pdf.embedFont(StandardFonts.TimesRomanItalic);
    const processor = Object.create(PdfFinalizationProcessor.prototype) as PdfFinalizationProcessor;
    (
      processor as unknown as {
        renderField: RenderFieldFn;
      }
    ).renderField(pdf, field, value, textFont, signatureFont);
    return { original, completed: await pdf.save() };
  }

  const field = {
    pageNumber: 1,
    x: { toNumber: () => 0.1 },
    y: { toNumber: () => 0.1 },
    width: { toNumber: () => 0.3 },
    height: { toNumber: () => 0.1 },
  };

  it.each([
    ['TEXT', 'Hello signer'],
    ['DATE', '2026-08-03'],
    ['INITIALS', 'GH'],
    ['SIGNATURE', { type: 'TYPED_NAME', name: 'Grace Hopper' }],
    ['CHECKBOX', true],
  ])('changes PDF output when rendering %s', async (type, value) => {
    const result = await render({ ...field, type }, value);
    expect(Buffer.from(result.completed).equals(Buffer.from(result.original))).toBe(false);
  });

  it('rejects fields referencing pages outside the PDF', async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage([600, 800]);
    const processor = Object.create(PdfFinalizationProcessor.prototype) as PdfFinalizationProcessor;
    const textFont = await pdf.embedFont(StandardFonts.Helvetica);
    const signatureFont = await pdf.embedFont(StandardFonts.TimesRomanItalic);
    expect(() =>
      (
        processor as unknown as {
          renderField: RenderFieldFn;
        }
      ).renderField(
        pdf,
        { ...field, pageNumber: 2, type: 'TEXT' },
        'value',
        textFont,
        signatureFont,
      ),
    ).toThrow('does not exist');
  });
});
