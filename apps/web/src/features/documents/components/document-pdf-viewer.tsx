'use client';

import type { PDFDocumentLoadingTask } from 'pdfjs-dist';
import { useEffect, useRef, useState, type PointerEvent } from 'react';

export type PdfOverlayField = {
  id: string;
  type: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string | null;
  recipientId?: string | null;
  color?: string;
};

type Position = {
  x: number;
  y: number;
  width?: number;
  height?: number;
};

type DragState = {
  field: PdfOverlayField;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  x: number;
  y: number;
};

type ResizeState = {
  field: PdfOverlayField;
  startX: number;
  startY: number;
  originWidth: number;
  originHeight: number;
  width: number;
  height: number;
};

type ViewerProps = {
  url: string;
  fields: PdfOverlayField[];
  headers?: Record<string, string>;
  currentPage?: number;
  zoom?: number;
  activeRecipientId?: string | null;
  onPageChange?: (page: number) => void;
  onSelect?: (field: PdfOverlayField) => void;
  onPlace?: (input: { pageNumber: number; x: number; y: number }) => void;
  onMove?: (input: { field: PdfOverlayField; x: number; y: number }) => void;
  onMoveEnd?: (input: { field: PdfOverlayField; x: number; y: number }) => void;
  onResizeEnd?: (input: { field: PdfOverlayField; width: number; height: number }) => void;
  onRefresh?: () => void;
};

export function DocumentPdfViewer({
  url,
  fields,
  headers,
  currentPage,
  zoom = 1,
  activeRecipientId,
  onPageChange,
  onSelect,
  onPlace,
  onMove,
  onMoveEnd,
  onResizeEnd,
  onRefresh,
}: ViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);

  const [internalPage, setInternalPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [availableWidth, setAvailableWidth] = useState(0);
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const page = currentPage ?? internalPage;
  const authorization = headers?.Authorization;
  const organizationId = headers?.['X-Organization-Id'];
  const pageFields = fields.filter((field) => field.pageNumber === page);

  const changePage = (nextPage: number) => {
    onPageChange?.(nextPage);
    if (currentPage === undefined) setInternalPage(nextPage);
  };

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const observer = new ResizeObserver(([entry]) => {
      setAvailableWidth(entry.contentRect.width);
    });

    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let task: PDFDocumentLoadingTask | undefined;

    async function renderPdf() {
      setLoading(true);
      setError(false);

      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

        task = pdfjs.getDocument({
          url,
          httpHeaders:
            authorization && organizationId
              ? {
                  Authorization: authorization,
                  'X-Organization-Id': organizationId,
                }
              : undefined,
        });

        const pdf = await task.promise;
        if (cancelled) return;

        setPageCount(pdf.numPages);
        const pdfPage = await pdf.getPage(page);
        const baseViewport = pdfPage.getViewport({ scale: 1 });
        const fitWidthScale = availableWidth
          ? Math.min(1.55, Math.max(0.45, (availableWidth - 64) / baseViewport.width))
          : 1.1;
        const renderViewport = pdfPage.getViewport({ scale: fitWidthScale });
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');

        if (!canvas || !context) {
          throw new Error('PDF canvas is unavailable.');
        }

        canvas.width = renderViewport.width;
        canvas.height = renderViewport.height;
        setCanvasSize({ width: renderViewport.width, height: renderViewport.height });

        await pdfPage.render({
          canvas,
          canvasContext: context,
          viewport: renderViewport,
        }).promise;
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void renderPdf();

    return () => {
      cancelled = true;
      task?.destroy();
    };
  }, [url, page, authorization, organizationId, availableWidth]);

  function placeField(event: PointerEvent<HTMLDivElement>) {
    if (!onPlace || !canvasSize.width) return;
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect) return;

    onPlace({
      pageNumber: page,
      x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
      y: clamp((event.clientY - rect.top) / rect.height, 0, 1),
    });
  }

  function moveField(event: PointerEvent<HTMLButtonElement>) {
    const state = dragRef.current;
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!state || !rect) return;

    const x = clamp(
      state.originX + (event.clientX - state.startX) / rect.width,
      0,
      1 - state.field.width,
    );
    const y = clamp(
      state.originY + (event.clientY - state.startY) / rect.height,
      0,
      1 - state.field.height,
    );

    state.x = x;
    state.y = y;
    setPositions((current) => ({
      ...current,
      [state.field.id]: { ...current[state.field.id], x, y },
    }));
    onMove?.({ field: state.field, x, y });
  }

  function resizeField(event: PointerEvent<HTMLSpanElement>) {
    const state = resizeRef.current;
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!state || !rect) return;

    const sensitivity = 0.7;
    const width = clamp(
      state.originWidth + ((event.clientX - state.startX) / rect.width) * sensitivity,
      0.03,
      1 - state.field.x,
    );
    const height = clamp(
      state.originHeight + ((event.clientY - state.startY) / rect.height) * sensitivity,
      0.03,
      1 - state.field.y,
    );

    state.width = width;
    state.height = height;
    setPositions((current) => ({
      ...current,
      [state.field.id]: {
        ...current[state.field.id],
        x: state.field.x,
        y: state.field.y,
        width,
        height,
      },
    }));
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-700/70 bg-[#050915]">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <button
          disabled={page <= 1 || loading}
          onClick={() => changePage(page - 1)}
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm disabled:opacity-40"
        >
          ← Previous
        </button>
        <span className="text-sm font-medium text-slate-300">
          Page {page} of {pageCount}
        </span>
        <button
          disabled={page >= pageCount || loading}
          onClick={() => changePage(page + 1)}
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm disabled:opacity-40"
        >
          Next →
        </button>
      </div>

      <div
        ref={viewportRef}
        className="relative min-h-[640px] overflow-auto bg-[radial-gradient(circle_at_50%_20%,#17233f_0%,#070b15_58%)] p-8"
      >
        {loading && (
          <div className="absolute inset-0 grid place-items-center text-slate-300">
            Rendering PDF…
          </div>
        )}

        {error && (
          <div className="mx-auto max-w-lg rounded-xl border border-rose-400/30 bg-rose-950/50 p-5 text-rose-100">
            <strong>PDF preview expired or unavailable</strong>
            <p className="mt-2 text-sm">Refresh the preview to request a new secure URL.</p>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="mt-4 rounded-lg border border-rose-300/40 px-3 py-2 text-sm"
              >
                Refresh preview
              </button>
            )}
          </div>
        )}

        <div
          className="mx-auto"
          style={{
            width: canvasSize.width * zoom,
            height: canvasSize.height * zoom,
          }}
        >
          <div
            ref={surfaceRef}
            onPointerDown={placeField}
            className="relative w-fit rounded-lg bg-white shadow-[0_25px_80px_rgba(0,0,0,.55)]"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
            }}
          >
            <canvas ref={canvasRef} className="block rounded-lg" />

            {!loading &&
              !error &&
              canvasSize.width > 0 &&
              pageFields.map((field) => {
                const position = positions[field.id];
                const x = position?.x ?? field.x;
                const y = position?.y ?? field.y;
                const width = position?.width ?? field.width;
                const height = position?.height ?? field.height;
                const color = field.color ?? '#67e8f9';
                const dimmed = activeRecipientId && field.recipientId !== activeRecipientId;

                return (
                  <button
                    key={field.id}
                    title={field.label ?? field.type}
                    onClick={(event) => event.stopPropagation()}
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      event.currentTarget.setPointerCapture(event.pointerId);
                      dragRef.current = {
                        field,
                        startX: event.clientX,
                        startY: event.clientY,
                        originX: x,
                        originY: y,
                        x,
                        y,
                      };
                      onSelect?.(field);
                    }}
                    onPointerMove={(event) => {
                      event.preventDefault();
                      moveField(event);
                    }}
                    onPointerUp={(event) => {
                      const state = dragRef.current;
                      if (state) {
                        onMoveEnd?.({ field: state.field, x: state.x, y: state.y });
                      }
                      dragRef.current = null;
                      event.currentTarget.releasePointerCapture?.(event.pointerId);
                    }}
                    onPointerCancel={() => {
                      dragRef.current = null;
                    }}
                    className={`absolute touch-none select-none cursor-move border-2 px-1 text-left text-[10px] font-semibold text-slate-950 transition-opacity ${
                      dimmed ? 'opacity-25' : 'opacity-100'
                    }`}
                    style={{
                      left: x * canvasSize.width,
                      top: y * canvasSize.height,
                      width: width * canvasSize.width,
                      height: height * canvasSize.height,
                      borderColor: color,
                      backgroundColor: `${color}33`,
                    }}
                  >
                    {field.label ?? field.type}
                    <span
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        event.currentTarget.setPointerCapture(event.pointerId);
                        resizeRef.current = {
                          field,
                          startX: event.clientX,
                          startY: event.clientY,
                          originWidth: width,
                          originHeight: height,
                          width,
                          height,
                        };
                      }}
                      onPointerMove={(event) => {
                        event.preventDefault();
                        resizeField(event);
                      }}
                      onPointerUp={(event) => {
                        const state = resizeRef.current;
                        if (state) {
                          onResizeEnd?.({
                            field: state.field,
                            width: state.width,
                            height: state.height,
                          });
                        }
                        resizeRef.current = null;
                        event.currentTarget.releasePointerCapture?.(event.pointerId);
                      }}
                      onPointerCancel={() => {
                        resizeRef.current = null;
                      }}
                      className="absolute bottom-0 right-0 h-3 w-3 touch-none cursor-se-resize border-l border-t border-cyan-950 bg-cyan-300"
                    />
                  </button>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}
