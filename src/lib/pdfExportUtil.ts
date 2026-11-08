// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface ExportPdfOptions {
  orientation?: 'portrait' | 'landscape';
  scale?: number;
  reportName?: string;
}

/**
 * Captures an HTML element and exports it directly as a formatted A4 PDF file.
 * Preserves high resolution, full Arabic typography, RTL alignment, borders,
 * stamps, and calculates automatic multi-page splitting.
 */
export async function exportElementToPdf(
  element: HTMLElement,
  filename: string,
  options?: ExportPdfOptions
): Promise<boolean> {
  // Temporarily hide elements marked with .no-print
  const noPrintEls = element.querySelectorAll<HTMLElement>('.no-print');
  const originalDisplays: string[] = [];
  noPrintEls.forEach((el, i) => {
    originalDisplays[i] = el.style.display;
    el.style.display = 'none';
  });

  try {
    const scale = options?.scale || 2;
    const orientation = options?.orientation || 'portrait';

    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: Math.max(element.scrollWidth, 1024)
    });

    const pdf = new jsPDF(orientation === 'portrait' ? 'p' : 'l', 'mm', 'a4');

    const pageWidth = orientation === 'portrait' ? 210 : 297;
    const pageHeight = orientation === 'portrait' ? 297 : 210;
    const margin = 8;
    const contentWidth = pageWidth - margin * 2;
    const maxPageContentHeight = pageHeight - margin * 2;

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const totalRenderHeight = (canvasHeight * contentWidth) / canvasWidth;

    if (totalRenderHeight <= maxPageContentHeight) {
      // Single Page
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, totalRenderHeight, undefined, 'FAST');
    } else {
      // Multi-Page Slicing
      const pageCanvasHeight = (maxPageContentHeight * canvasWidth) / contentWidth;
      let sourceY = 0;
      let pageIndex = 0;

      while (sourceY < canvasHeight) {
        if (pageIndex > 0) {
          pdf.addPage();
        }

        const currentSliceHeight = Math.min(pageCanvasHeight, canvasHeight - sourceY);
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvasWidth;
        sliceCanvas.height = currentSliceHeight;

        const ctx = sliceCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvasWidth, currentSliceHeight);
          ctx.drawImage(
            canvas,
            0,
            sourceY,
            canvasWidth,
            currentSliceHeight,
            0,
            0,
            canvasWidth,
            currentSliceHeight
          );

          const sliceImgData = sliceCanvas.toDataURL('image/png');
          const sliceRenderHeight = (currentSliceHeight * contentWidth) / canvasWidth;
          pdf.addImage(
            sliceImgData,
            'PNG',
            margin,
            margin,
            contentWidth,
            sliceRenderHeight,
            undefined,
            'FAST'
          );
        }

        sourceY += pageCanvasHeight;
        pageIndex++;
      }
    }

    const cleanFilename = (filename || 'التقرير_المالي').replace(/[:/\\?*|"<>\s]+/g, '_');
    pdf.save(`${cleanFilename}.pdf`);
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  } finally {
    // Restore hidden elements
    noPrintEls.forEach((el, i) => {
      el.style.display = originalDisplays[i];
    });
  }
}
