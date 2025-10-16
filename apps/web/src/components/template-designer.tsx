'use client';

import { useMemo, useState } from 'react';
import { Image as ImageIcon, Paintbrush2, Ruler, Save } from 'lucide-react';
import { useDashboardStore } from '@/hooks/use-dashboard-store';
import type { TicketTemplate } from '@/types';

const FONT_OPTIONS = ['Inter', 'Poppins', 'Montserrat', 'Roboto', 'Playfair Display', 'Lato'];

const DEFAULT_HTML = `<div class="card">
  <div class="heading">Ceremonia de Graduación</div>
  <div class="name">{{invitee.name}}</div>
  <div class="role">{{invitee.role === 'student' ? 'Estudiante' : 'Invitado'}}</div>
  <div class="footer">Presenta este código en el ingreso</div>
</div>`;

const DEFAULT_CSS = `.card {
  width: 860px;
  height: 540px;
  padding: 56px;
  background: linear-gradient(135deg, #0f172a, #1e293b);
  color: #f1f5f9;
  font-family: 'Inter', sans-serif;
  border-radius: 32px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.heading {
  font-size: 32px;
  letter-spacing: 0.3em;
  text-transform: uppercase;
}
.name {
  font-size: 48px;
  font-weight: 600;
}
.role {
  font-size: 22px;
  opacity: 0.8;
}
.footer {
  font-size: 16px;
  opacity: 0.7;
}`;

export const TemplateDesigner = () => {
  const [name, setName] = useState('Plantilla principal');
  const [type, setType] = useState<'html' | 'image'>('html');
  const [fontFamily, setFontFamily] = useState(FONT_OPTIONS[0]);
  const [html, setHtml] = useState(DEFAULT_HTML);
  const [css, setCss] = useState(DEFAULT_CSS);
  const [background, setBackground] = useState<string | undefined>();
  const [qrPosition, setQrPosition] = useState({ x: 72, y: 68, size: 22 });
  const upsertTemplate = useDashboardStore((state) => state.upsertTemplate);
  const selectTemplate = useDashboardStore((state) => state.selectTemplate);
  const templates = useDashboardStore((state) => state.templates);
  const selectedTemplateId = useDashboardStore((state) => state.selectedTemplateId);

  const handleFile = async (file: File) => {
    const isHtml = file.type === 'text/html';
    const isImage = file.type.startsWith('image/');

    if (isImage && type === 'image') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string | undefined;
        if (result) {
          setBackground(result);
        }
      };
      reader.readAsDataURL(file);
      return;
    }

    if (isHtml && type === 'html') {
      const text = await file.text();
      setHtml(text);
      return;
    }

    alert('El archivo seleccionado no coincide con el tipo de plantilla actual.');
  };

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) void handleFile(file);
  };

  const previewMarkup = useMemo(() => {
    if (type === 'image') {
      return null;
    }
    return `
      <style id="template-font"> @import url('https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s/g, '+')}:wght@300;400;600&display=swap'); ${css}</style>
      ${html}
    `;
  }, [type, css, html, fontFamily]);

  const handleSave = () => {
    const template: TicketTemplate = {
      id: crypto.randomUUID(),
      name,
      type,
      backgroundUrl: type === 'image' ? background : undefined,
      htmlMarkup: type === 'html' ? html : undefined,
      cssStyles: type === 'html' ? css : undefined,
      fontFamily,
      qrPosition,
      createdBy: 'Administrador',
      updatedAt: new Date().toISOString(),
    };
    upsertTemplate(template);
    selectTemplate(template.id);
  };

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Diseñador de plantillas</h2>
          <p className="mt-1 text-sm text-slate-300">
            Personaliza tarjetas con HTML/CSS o imágenes y posiciona el QR con precisión milimétrica.
          </p>
        </div>
        <div className="flex gap-2 rounded-full border border-slate-700 bg-slate-900/80 p-1">
          <button
            type="button"
            onClick={() => setType('html')}
            className={`rounded-full px-4 py-1 text-xs font-medium transition ${
              type === 'html' ? 'bg-emerald-500/20 text-emerald-200' : 'text-slate-400'
            }`}
          >
            HTML/CSS
          </button>
          <button
            type="button"
            onClick={() => setType('image')}
            className={`rounded-full px-4 py-1 text-xs font-medium transition ${
              type === 'image' ? 'bg-emerald-500/20 text-emerald-200' : 'text-slate-400'
            }`}
          >
            Imagen PNG/JPG
          </button>
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <label
            onDrop={handleDrop}
            onDragOver={(event) => event.preventDefault()}
            className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-emerald-400/40 bg-slate-900/50 px-6 py-10 text-center text-sm text-slate-300"
          >
            <input
              type="file"
              accept={type === 'html' ? 'text/html,.html,.htm' : 'image/png,image/jpeg'}
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
            {type === 'html' ? <Paintbrush2 className="mb-3 h-10 w-10 text-emerald-300" /> : <ImageIcon className="mb-3 h-10 w-10 text-emerald-300" />}
            <span className="font-medium text-white">
              Sube tu {type === 'html' ? 'plantilla HTML' : 'diseño de fondo'}
            </span>
            <span className="mt-1 text-xs text-slate-400">Arrastra y suelta o haz clic para explorar</span>
          </label>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Nombre</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
            />
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tipografía</label>
            <select
              value={fontFamily}
              onChange={(event) => setFontFamily(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
            >
              {FONT_OPTIONS.map((fontOption) => (
                <option key={fontOption} value={fontOption} className="bg-slate-900 text-white">
                  {fontOption}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
              <Ruler className="h-4 w-4 text-emerald-300" /> Posicionamiento QR
            </h3>
            <p className="mt-1 text-xs text-slate-400">Valores expresados en porcentaje relativo al tamaño del lienzo.</p>
            <div className="mt-4 space-y-3 text-xs text-slate-300">
              <label className="flex items-center justify-between gap-4">
                X ({qrPosition.x}%)
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={qrPosition.x}
                  onChange={(event) =>
                    setQrPosition((state) => ({ ...state, x: Number(event.target.value) }))
                  }
                  className="flex-1"
                />
              </label>
              <label className="flex items-center justify-between gap-4">
                Y ({qrPosition.y}%)
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={qrPosition.y}
                  onChange={(event) =>
                    setQrPosition((state) => ({ ...state, y: Number(event.target.value) }))
                  }
                  className="flex-1"
                />
              </label>
              <label className="flex items-center justify-between gap-4">
                Tamaño ({qrPosition.size}%)
                <input
                  type="range"
                  min={10}
                  max={60}
                  value={qrPosition.size}
                  onChange={(event) =>
                    setQrPosition((state) => ({ ...state, size: Number(event.target.value) }))
                  }
                  className="flex-1"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {type === 'html' ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">HTML</p>
                <textarea
                  value={html}
                  onChange={(event) => setHtml(event.target.value)}
                  className="mt-2 h-48 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 font-mono text-xs text-slate-200 focus:border-emerald-400 focus:outline-none"
                />
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">CSS</p>
                <textarea
                  value={css}
                  onChange={(event) => setCss(event.target.value)}
                  className="mt-2 h-48 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 font-mono text-xs text-slate-200 focus:border-emerald-400 focus:outline-none"
                />
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-emerald-500/40 bg-slate-900/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Vista previa</p>
            <div className="mt-4 flex items-center justify-center overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              {type === 'html' ? (
                <div className="relative w-full" style={{ aspectRatio: '16 / 9' }}>
                  <iframe
                    title="preview"
                    className="h-full w-full rounded-2xl border border-slate-800 bg-white"
                    srcDoc={previewMarkup ?? ''}
                  />
                  <div
                    className="absolute rounded-2xl border-2 border-emerald-400/80 bg-emerald-500/10 shadow-lg"
                    style={{
                      left: `${qrPosition.x}%`,
                      top: `${qrPosition.y}%`,
                      width: `${qrPosition.size}%`,
                      paddingBottom: `${qrPosition.size}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase text-emerald-200">
                      Zona QR
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative w-full" style={{ aspectRatio: '16 / 9' }}>
                  <div
                    className="h-full w-full rounded-2xl border border-slate-800 bg-slate-950"
                    style={background ? { backgroundImage: `url(${background})`, backgroundSize: 'cover' } : undefined}
                  />
                  <div
                    className="absolute rounded-2xl border-2 border-emerald-400/80 bg-emerald-500/10 shadow-lg"
                    style={{
                      left: `${qrPosition.x}%`,
                      top: `${qrPosition.y}%`,
                      width: `${qrPosition.size}%`,
                      paddingBottom: `${qrPosition.size}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase text-emerald-200">
                      QR
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-400">
              Usa variables como <code className="text-emerald-300">{'{'}invitee.name{'}'}</code>, <code className="text-emerald-300">{'{'}invitee.ticketCode{'}'}</code> y <code className="text-emerald-300">{'{'}ceremony.name{'}'}</code> en tu HTML.
            </p>
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
            >
              <Save className="h-4 w-4" /> Guardar plantilla
            </button>
          </div>
        </div>
      </div>

      {templates.length ? (
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Plantillas guardadas</p>
          <ul className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {templates.map((template) => (
              <li key={template.id}>
                <button
                  type="button"
                  onClick={() => selectTemplate(template.id)}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                    template.id === selectedTemplateId
                      ? 'border-emerald-400/70 bg-emerald-500/10 text-emerald-200'
                      : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-emerald-500/30'
                  }`}
                >
                  <p className="font-semibold text-white">{template.name}</p>
                  <p className="text-xs text-slate-400">{template.type === 'html' ? 'HTML/CSS' : 'Imagen'} · QR {template.qrPosition.x}% · {template.qrPosition.y}%</p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
};
