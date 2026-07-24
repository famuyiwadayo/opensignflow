import {
  Injectable,
  InternalServerErrorException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';

import { apiError, ErrorCode } from '@/common';

@Injectable()
export class PdfService {
  async getPageCount(buffer: Buffer): Promise<number> {
    try {
      const pdf = await PDFDocument.load(buffer, {
        ignoreEncryption: false,
      });

      return pdf.getPageCount();
    } catch (error) {
      const message = error instanceof Error ? error.message : '';

      if (/encrypted|password/i.test(message)) {
        throw new UnprocessableEntityException(
          apiError(
            ErrorCode.PDF_ENCRYPTED_UNSUPPORTED,
            'Encrypted PDFs are not supported yet.',
          ),
        );
      }

      throw new InternalServerErrorException(
        apiError(
          ErrorCode.PDF_PAGE_COUNT_FAILED,
          'Could not determine PDF page count.',
        ),
      );
    }
  }
}
