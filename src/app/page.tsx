'use client';

import { useState, useEffect } from 'react';
import { HtmlLayout } from '@/app/_html';
import { jsPDF } from 'jspdf';

export default function IndexPage() {
  const [status, setStatus] = useState<string>('');
  const [statusType, setStatusType] = useState<'info' | 'success' | 'error'>('info');
  const [progress, setProgress] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  useEffect(() => {
    import('pdfjs-dist').then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString();
    });
  }, []);

  const processPdf = async (file: File) => {
    if (file.type !== 'application/pdf') {
      setStatus('Bitte wähle eine gültige PDF-Datei aus.');
      setStatusType('error');
      return;
    }

    setIsProcessing(true);
    setStatus('Lade PDF...');
    setStatusType('info');
    setProgress(0);

    try {
      const pdfjs = await import('pdfjs-dist');
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

      let newPdf: jsPDF | null = null;
      const totalPages = pdf.numPages;

      for (let i = 1; i <= totalPages; i++) {
        setStatus(`Verarbeite Seite ${i} von ${totalPages}...`);

        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.5 });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport, canvas: canvas }).promise;

        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        const orientation = viewport.width > viewport.height ? 'l' : 'p';

        if (i === 1) {
          newPdf = new jsPDF(orientation, 'pt', [viewport.width, viewport.height]);
        } else if (newPdf) {
          newPdf.addPage([viewport.width, viewport.height], orientation);
        }

        newPdf?.addImage(imgData, 'JPEG', 0, 0, viewport.width, viewport.height);
        setProgress((i / totalPages) * 100);
      }

      if (newPdf) {
        const newFileName = `${file.name.replace(/\.pdf$/i, '')}_unlocked.pdf`;
        newPdf.save(newFileName);
        setStatus('Erfolgreich freigeschaltet und heruntergeladen!');
        setStatusType('success');
      }
    } catch (error) {
      console.error(error);
      setStatus('Fehler: Datei ist eventuell mit einem Passwort geschützt.');
      setStatusType('error');
    } finally {
      setIsProcessing(false);
    }
  };
  return (
    <HtmlLayout
      onFileSelect={processPdf}
      status={status}
      statusType={statusType}
      progress={progress}
      isProcessing={isProcessing}
    />
  );
}