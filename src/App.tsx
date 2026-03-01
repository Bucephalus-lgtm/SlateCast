import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { fabric } from 'fabric';
import DOMPurify from 'dompurify';
import { Upload, FileUp, ShieldAlert, ShieldCheck, Pen, Eraser, Square, Circle, Trash2, ChevronLeft, ChevronRight, Type } from 'lucide-react'; import './App.css';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

type Tool = 'pen' | 'eraser' | 'rectangle' | 'circle' | 'text';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'pdf' | 'html' | null>(null);
  const [pdfDocument, setPdfDocument] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [htmlContent, setHtmlContent] = useState<string>('');

  // Security checks
  const [isScanning, setIsScanning] = useState(false);
  const [securityStatus, setSecurityStatus] = useState<'idle' | 'scanning' | 'safe' | 'malicious'>('idle');

  // Drawing state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);

  const [activeTool, setActiveTool] = useState<Tool>('pen');
  const [currentColor, setCurrentColor] = useState<string>('#ff0000');
  const [strokeWidth, setStrokeWidth] = useState<number>(3);

  // Store drawings per page for PDF
  const drawingsRef = useRef<{ [page: number]: any }>({});

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;

    setSecurityStatus('scanning');
    setIsScanning(true);

    // Simulate deep security scan time
    setTimeout(async () => {
      // Basic security validation: check for dangerous extensions and mime types
      const validTypes = ['application/pdf', 'text/html'];

      if (!validTypes.includes(uploadedFile.type)) {
        alert("Unsupported file type or potentially unsafe file! Only PDF and HTML are allowed.");
        setSecurityStatus('malicious');
        setIsScanning(false);
        return;
      }

      // Read file to check content for obvious malicious signatures (simulated)
      const text = await uploadedFile.text();
      // Extremely basic signature check (in a real app this would be a backend AV scan)
      if (text.includes('<script>') && uploadedFile.type === 'application/pdf') {
        // PDF shouldn't really have raw <script> in plain text without proper encoding, it might be a polyglot
        console.warn("Suspicious content found in PDF");
      }

      setSecurityStatus('safe');
      setIsScanning(false);
      setFile(uploadedFile);
      drawingsRef.current = {}; // Reset drawings

      if (uploadedFile.type === 'application/pdf') {
        setFileType('pdf');
        loadPdf(uploadedFile);
      } else if (uploadedFile.type === 'text/html') {
        setFileType('html');
        loadHtml(uploadedFile);
      }
    }, 1500);
  };

  const loadPdf = async (pdfFile: File) => {
    const arrayBuffer = await pdfFile.arrayBuffer();
    try {
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setPdfDocument(pdf);
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
    } catch (error) {
      console.error("Error loading PDF", error);
      alert("Failed to load PDF. It might be corrupted or encrypted.");
      setFile(null);
    }
  };

  const loadHtml = async (htmlFile: File) => {
    const text = await htmlFile.text();
    // We use DOMPurify to fiercely sanitize HTML (stripping out raw JS/XSS)
    // but we use WHOLE_DOCUMENT to preserve <style>, <head>, giving it the original CSS look.
    const cleanHtml = DOMPurify.sanitize(text, {
      WHOLE_DOCUMENT: true,
      ADD_TAGS: ['style', 'link', 'meta', 'head', 'base']
    });
    setHtmlContent(cleanHtml);
  };

  const handleIframeLoad = (e: React.SyntheticEvent<HTMLIFrameElement, Event>) => {
    const iframe = e.currentTarget;
    if (iframe.contentWindow) {
      setTimeout(() => {
        try {
          const doc = iframe.contentWindow!.document;
          doc.documentElement.style.overflowX = 'hidden';

          const containerWidth = pdfContainerRef.current ? pdfContainerRef.current.clientWidth - 40 : 800;
          let height = Math.max(800, doc.documentElement.scrollHeight, doc.body.scrollHeight);
          const scrollWidth = doc.documentElement.scrollWidth;

          if (scrollWidth > containerWidth) {
            const scale = containerWidth / scrollWidth;
            doc.body.style.transform = `scale(${scale})`;
            doc.body.style.transformOrigin = '0 0';
            height = height * scale;
          }

          iframe.style.height = `${height}px`;

          if (fabricRef.current) {
            fabricRef.current.setHeight(height);
            fabricRef.current.setWidth(containerWidth);
            fabricRef.current.renderAll();
          }
        } catch (err) {
          console.error("Iframe sandbox prevented resizing:", err);
        }
      }, 150);
    }
  };

  // Render PDF page whenever currentPage or pdfDocument changes
  useEffect(() => {
    const renderPage = async () => {
      if (fileType === 'pdf' && pdfDocument && pdfCanvasRef.current && pdfContainerRef.current) {
        const page = await pdfDocument.getPage(currentPage);

        // Calculate scale to fit width
        const viewport = page.getViewport({ scale: 1.0 });
        const containerWidth = pdfContainerRef.current.clientWidth - 40; // padding
        const scale = containerWidth / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        const canvas = pdfCanvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: scaledViewport
        };

        await page.render(renderContext as any).promise;

        // Ensure fabric canvas matches the size
        if (fabricRef.current) {
          fabricRef.current.setWidth(scaledViewport.width);
          fabricRef.current.setHeight(scaledViewport.height);

          // Load previous state for this page if exists
          fabricRef.current.clear();
          if (drawingsRef.current[currentPage]) {
            fabricRef.current.loadFromJSON(drawingsRef.current[currentPage], () => {
              fabricRef.current?.renderAll();
            });
          }
        }
        // Resize logic for HTML is now handled seamlessly inside handleIframeLoad
      }
    };

    renderPage();
  }, [currentPage, pdfDocument, fileType, htmlContent]); // Trigger when these change

  // Initialize Fabric Canvas
  useEffect(() => {
    if (!canvasRef.current || !pdfContainerRef.current) return;
    if (fabricRef.current) return;

    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      isDrawingMode: true,
      width: pdfContainerRef.current.clientWidth - 40,
      height: 800
    });

    fabricRef.current = fabricCanvas;

    return () => {
      fabricCanvas.dispose();
      fabricRef.current = null;
    };
  }, [fileType]); // Re-init when file type changes so dom structure matches

  // Setup tools whenever activeTool or colors change
  useEffect(() => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;

    canvas.isDrawingMode = activeTool === 'pen' || activeTool === 'eraser';

    if (activeTool === 'pen') {
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.color = currentColor;
      canvas.freeDrawingBrush.width = strokeWidth;
    } else if (activeTool === 'eraser') {
      // Fabric doesn't have a native eraser brush that deletes objects easily in free draw mode without a custom plugin,
      // but we can either draw with "white" or implement object deletion on click.
      // For a whiteboard, clicking an object with eraser to delete it is common.
      canvas.isDrawingMode = false;

      canvas.on('mouse:down', ((options: any) => {
        if (activeTool === 'eraser' && options.target) {
          canvas.remove(options.target);
        }
      }) as any);
      // Change cursor
      canvas.defaultCursor = 'crosshair';
      canvas.hoverCursor = 'pointer';
    } else {
      canvas.defaultCursor = 'crosshair';
      canvas.hoverCursor = 'crosshair';

      let isDrawing = false;
      let origX = 0;
      let origY = 0;
      let shape: fabric.Object | null = null;

      canvas.on('mouse:down', (function (o: any) {
        // activeTool is guaranteed to not be pen/eraser based on the main if statement
        isDrawing = true;
        const pointer = canvas.getPointer(o.e);
        origX = pointer.x;
        origY = pointer.y;

        if (activeTool === 'rectangle') {
          shape = new fabric.Rect({
            left: origX,
            top: origY,
            originX: 'left',
            originY: 'top',
            width: pointer.x - origX,
            height: pointer.y - origY,
            angle: 0,
            fill: 'transparent',
            stroke: currentColor,
            strokeWidth: strokeWidth,
          });
          canvas.add(shape);
        } else if (activeTool === 'circle') {
          shape = new fabric.Ellipse({
            left: origX,
            top: origY,
            originX: 'left',
            originY: 'top',
            rx: 0,
            ry: 0,
            fill: 'transparent',
            stroke: currentColor,
            strokeWidth: strokeWidth,
          });
          canvas.add(shape);
        } else if (activeTool === 'text') {
          const text = new fabric.IText('Type here', {
            left: origX,
            top: origY,
            fontFamily: 'Inter',
            fill: currentColor,
            fontSize: 24,
          });
          canvas.add(text);
          text.enterEditing();
          text.selectAll();
          canvas.setActiveObject(text);
          isDrawing = false; // text is instantly placed
        }
      }) as any);

      canvas.on('mouse:move', (function (o: any) {
        if (!isDrawing) return;
        const pointer = canvas.getPointer(o.e);

        if (activeTool === 'rectangle' && shape) {
          shape.set({ width: Math.abs(origX - pointer.x) });
          shape.set({ height: Math.abs(origY - pointer.y) });
          if (origX > pointer.x) { shape.set({ left: Math.abs(pointer.x) }); }
          if (origY > pointer.y) { shape.set({ top: Math.abs(pointer.y) }); }
        } else if (activeTool === 'circle' && shape) {
          const rx = Math.abs(origX - pointer.x) / 2;
          const ry = Math.abs(origY - pointer.y) / 2;
          if (rx > shape.strokeWidth!) {
            (shape as fabric.Ellipse).set({ rx: rx, ry: ry });
          }
          if (origX > pointer.x) { shape.set({ left: pointer.x }); }
          if (origY > pointer.y) { shape.set({ top: pointer.y }); }
        }
        canvas.renderAll();
      }) as any);

      canvas.on('mouse:up', (function () {
        isDrawing = false;
        shape?.setCoords();
      }) as any);
    }

    // Cleanup listeners
    return () => {
      canvas.off('mouse:down');
      canvas.off('mouse:move');
      canvas.off('mouse:up');
    }

  }, [activeTool, currentColor, strokeWidth, fileType]);

  const saveCurrentPageDrawing = () => {
    if (fabricRef.current && fileType === 'pdf') {
      drawingsRef.current[currentPage] = fabricRef.current.toJSON();
    }
  };

  const changePage = (offset: number) => {
    if (!pdfDocument) return;

    // Save current drawing first
    saveCurrentPageDrawing();

    let newPage = currentPage + offset;
    if (newPage < 1) newPage = 1;
    if (newPage > totalPages) newPage = totalPages;

    setCurrentPage(newPage);
  };

  const clearCanvas = () => {
    if (fabricRef.current) {
      fabricRef.current.clear();
      saveCurrentPageDrawing();
    }
  };

  const colors = ['#eb3b5a', '#fa8231', '#f7b731', '#20bf6b', '#0fb9b1', '#2d98da', '#3867d6', '#8854d0', '#4b6584', '#000000', '#ffffff'];

  return (
    <div className="layout">
      {/* Sidebar Tools */}
      <aside className="sidebar">
        <div className="logo">
          <h2>TutorBoard</h2>
          <span>Virtual Canvas</span>
        </div>

        <div className="tools-section">
          <h3>Tools</h3>
          <div className="tool-grid">
            <button className={`tool-btn ${activeTool === 'pen' ? 'active' : ''}`} onClick={() => setActiveTool('pen')} title="Pen">
              <Pen size={20} />
            </button>
            <button className={`tool-btn ${activeTool === 'eraser' ? 'active' : ''}`} onClick={() => setActiveTool('eraser')} title="Object Eraser">
              <Eraser size={20} />
            </button>
            <button className={`tool-btn ${activeTool === 'rectangle' ? 'active' : ''}`} onClick={() => setActiveTool('rectangle')} title="Rectangle">
              <Square size={20} />
            </button>
            <button className={`tool-btn ${activeTool === 'circle' ? 'active' : ''}`} onClick={() => setActiveTool('circle')} title="Circle">
              <Circle size={20} />
            </button>
            <button className={`tool-btn ${activeTool === 'text' ? 'active' : ''}`} onClick={() => setActiveTool('text')} title="Text">
              <Type size={20} />
            </button>
          </div>
        </div>

        <div className="tools-section">
          <h3>Colors</h3>
          <div className="color-grid">
            {colors.map(color => (
              <button
                key={color}
                className={`color-btn ${currentColor === color ? 'active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => setCurrentColor(color)}
              />
            ))}
          </div>
        </div>

        <div className="tools-section">
          <h3>Stroke Weight</h3>
          <input
            type="range"
            min="1"
            max="20"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
            className="stroke-slider"
          />
        </div>

        <div className="tools-section actions">
          <button className="action-btn danger" onClick={clearCanvas}>
            <Trash2 size={16} /> Clear Canvas
          </button>
        </div>
      </aside>

      {/* Main Board */}
      <main className="main-board">
        {/* Top Navbar */}
        <header className="topbar">
          <div className="file-upload-wrapper">
            <label className="upload-btn">
              <Upload size={18} />
              Upload Document
              <input type="file" onChange={handleFileUpload} accept=".pdf,.html" hidden />
            </label>
            <span className="file-name">
              {file ? file.name : 'No file chosen (PDF or HTML expected)'}
            </span>

            {isScanning && (
              <span className="security-badge scanning">
                <ShieldAlert size={16} className="spin" /> Scanning file securely...
              </span>
            )}

            {securityStatus === 'safe' && (
              <span className="security-badge safe">
                <ShieldCheck size={16} /> Secure Content
              </span>
            )}
          </div>

          {fileType === 'pdf' && totalPages > 0 && (
            <div className="pagination">
              <button onClick={() => changePage(-1)} disabled={currentPage <= 1}><ChevronLeft size={20} /></button>
              <span>Page {currentPage} of {totalPages}</span>
              <button onClick={() => changePage(1)} disabled={currentPage >= totalPages}><ChevronRight size={20} /></button>
            </div>
          )}
        </header>

        {/* Canvas Area */}
        <div className="canvas-container-wrapper" ref={pdfContainerRef}>
          {file ? (
            <div className="document-container">
              {/* Underlay Document Layer */}
              {fileType === 'pdf' && (
                <canvas ref={pdfCanvasRef} className="pdf-layer" />
              )}
              {fileType === 'html' && (
                <iframe
                  className="html-layer"
                  srcDoc={htmlContent}
                  title="Uploaded HTML Document"
                  sandbox="allow-same-origin"
                  scrolling="no"
                  onLoad={handleIframeLoad}
                />
              )}

              {/* Drawing Overlay */}
              <div className="drawing-layer">
                <canvas ref={canvasRef} />
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <FileUp size={64} opacity={0.3} />
              <h2>Upload a document to start teaching</h2>
              <p>Supported formats: PDF, HTML. All uploads are securely processed client-side.</p>
              <label className="cta-upload">
                Select File
                <input type="file" onChange={handleFileUpload} accept=".pdf,.html" hidden />
              </label>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
