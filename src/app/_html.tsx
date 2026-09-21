import React, { useState } from 'react';

export const HtmlLayout: React.FC<{
    onFileSelect: (file: File) => void;
    status: string;
    statusType: 'info' | 'success' | 'error';
    progress: number;
    isProcessing: boolean;
}
> = ({
    onFileSelect,
    status,
    statusType,
    progress,
    isProcessing,
}) => {
        const [theme, setTheme] = useState<'dark' | 'light'>('dark');
        const [contrast, setContrast] = useState<'normal' | 'high'>('normal');
        const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

        const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
            e.preventDefault();
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                onFileSelect(e.dataTransfer.files[0]);
            }
        };

        const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
            e.preventDefault();
        };

        const handleKeyDown = (e: React.KeyboardEvent<HTMLLabelElement>) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const input = document.getElementById('file-upload') as HTMLInputElement;
                if (input) input.click();
            }
        };

        const isDark = theme === 'dark';
        const isHighContrast = contrast === 'high';

        const bgClass = isDark
            ? 'bg-black text-white'
            : isHighContrast ? 'bg-white text-black' : 'bg-neutral-100 text-neutral-900';

        const cardBgClass = isDark
            ? isHighContrast ? 'bg-black border-2 border-white shadow-none' : 'bg-neutral-950 border border-neutral-800 shadow-2xl'
            : isHighContrast ? 'bg-white border-2 border-black shadow-none' : 'bg-white border border-neutral-200 shadow-xl';

        const textMutedClass = isDark
            ? isHighContrast ? 'text-neutral-200' : 'text-neutral-400'
            : isHighContrast ? 'text-neutral-800' : 'text-neutral-500';

        const dropZoneClass = isDark
            ? isHighContrast
                ? 'border-2 border-white bg-black hover:bg-neutral-900 focus-within:ring-2 focus-within:ring-white'
                : 'border-2 border-dashed border-neutral-800 hover:border-white hover:bg-neutral-900/50 focus-within:ring-2 focus-within:ring-white'
            : isHighContrast
                ? 'border-2 border-black bg-white hover:bg-neutral-100 focus-within:ring-2 focus-within:ring-black'
                : 'border-2 border-dashed border-neutral-300 hover:border-black hover:bg-neutral-50 focus-within:ring-2 focus-within:ring-black';

        const accentTextClass = isDark
            ? 'text-white font-semibold underline underline-offset-4 decoration-neutral-500 hover:decoration-white'
            : 'text-black font-semibold underline underline-offset-4 decoration-neutral-400 hover:decoration-black';

        const linkStyleClass = isDark
            ? 'text-white hover:underline focus:underline font-medium decoration-neutral-500 underline-offset-4 focus:outline-none focus:ring-1 focus:ring-white rounded'
            : 'text-black hover:underline focus:underline font-medium decoration-neutral-400 underline-offset-4 focus:outline-none focus:ring-1 focus:ring-black rounded';

        const progressBgClass = isDark ? 'bg-neutral-800' : 'bg-neutral-200';
        const progressBarClass = isDark ? 'bg-white' : 'bg-black';

        return (
            <main className={`min-h-screen relative flex items-center justify-center p-4 transition-colors duration-200 ${bgClass}`}>
                <div className="max-w-md w-full flex flex-col items-center">
                    <section
                        aria-labelledby="main-heading"
                        className={`w-full rounded-2xl p-8 text-center transition-colors duration-200 ${cardBgClass}`}
                    >
                        <h1 id="main-heading" className="text-2xl font-bold mb-2 tracking-tight">
                            PDF Unlocker
                        </h1>
                        <p className={`text-sm mb-6 ${textMutedClass}`}>
                            Entferne Bearbeitungssperren
                        </p>

                        <label
                            htmlFor="file-upload"
                            tabIndex={0}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onKeyDown={handleKeyDown}
                            aria-label="PDF-Datei auswählen oder hierher ziehen"
                            className={`rounded-xl p-8 block cursor-pointer transition-all outline-none ${dropZoneClass}`}
                        >
                            <span className="text-4xl block mb-3" aria-hidden="true">📄</span>
                            <span className={`text-sm ${textMutedClass}`}>
                                Klicke zum Auswählen oder{' '}
                                <span className={accentTextClass}>PDF hierher ziehen</span>
                            </span>
                            <input
                                id="file-upload"
                                type="file"
                                accept="application/pdf"
                                className="sr-only"
                                onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])}
                            />
                        </label>

                        {isProcessing && (
                            <div
                                role="progressbar"
                                aria-valuenow={progress}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label="Verarbeitungsfortschritt"
                                className={`w-full h-2 rounded-full mt-6 overflow-hidden ${progressBgClass}`}
                            >
                                <div
                                    className={`h-full transition-all duration-200 ${progressBarClass}`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        )}

                        {status && (
                            <p
                                role="status"
                                aria-live="polite"
                                className={`mt-4 text-sm font-medium ${statusType === 'error'
                                    ? 'text-red-500 font-medium'
                                    : statusType === 'success'
                                        ? 'text-emerald-400 font-medium'
                                        : textMutedClass
                                    }`}
                            >
                                {status}
                            </p>
                        )}
                    </section>

                    <footer className={`mt-6 text-xs text-center ${textMutedClass}`}>
                        Erstellt von{' '}
                        <a
                            href="https://munir.mardinli.dev/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={linkStyleClass}
                            aria-label="Munir Mardinli (öffnet in neuem Tab)"
                        >
                            Munir Mardinli
                        </a>
                    </footer>
                </div>

                <div className="fixed bottom-6 right-6 z-50">
                    {isSettingsOpen && (
                        <div
                            role="dialog"
                            aria-labelledby="settings-heading"
                            aria-modal="true"
                            className={`absolute bottom-14 right-0 w-64 p-4 rounded-xl shadow-2xl border mb-2 transition-all ${cardBgClass}`}
                        >
                            <h2 id="settings-heading" className="font-bold text-sm mb-3 border-b pb-1 border-neutral-700/50">
                                Einstellungen
                            </h2>

                            <fieldset className="mb-4">
                                <legend className={`block text-xs mb-1 font-medium ${textMutedClass}`}>
                                    Erscheinungsbild
                                </legend>
                                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Erscheinungsbild wählen">
                                    <button
                                        type="button"
                                        role="radio"
                                        aria-checked={theme === 'dark'}
                                        onClick={() => setTheme('dark')}
                                        className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-all ${theme === 'dark'
                                            ? (isDark ? 'bg-white text-black border-white' : 'bg-black text-white border-black')
                                            : 'bg-transparent border-neutral-700 hover:bg-neutral-800/50'
                                            }`}
                                    >
                                        <span aria-hidden="true">🌙 </span>Dunkel
                                    </button>
                                    <button
                                        type="button"
                                        role="radio"
                                        aria-checked={theme === 'light'}
                                        onClick={() => setTheme('light')}
                                        className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-all ${theme === 'light'
                                            ? (isDark ? 'bg-white text-black border-white' : 'bg-black text-white border-black')
                                            : 'bg-transparent border-neutral-700 hover:bg-neutral-800/50'
                                            }`}
                                    >
                                        <span aria-hidden="true">☀️ </span>Hell
                                    </button>
                                </div>
                            </fieldset>

                            <fieldset className="mb-4">
                                <legend className={`block text-xs mb-1 font-medium ${textMutedClass}`}>
                                    Kontrast
                                </legend>
                                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Kontrast wählen">
                                    <button
                                        type="button"
                                        role="radio"
                                        aria-checked={contrast === 'normal'}
                                        onClick={() => setContrast('normal')}
                                        className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-all ${contrast === 'normal'
                                            ? (isDark ? 'bg-white text-black border-white' : 'bg-black text-white border-black')
                                            : 'bg-transparent border-neutral-700 hover:bg-neutral-800/50'
                                            }`}
                                    >
                                        Normal
                                    </button>
                                    <button
                                        type="button"
                                        role="radio"
                                        aria-checked={contrast === 'high'}
                                        onClick={() => setContrast('high')}
                                        className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-all ${contrast === 'high'
                                            ? (isDark ? 'bg-white text-black border-white' : 'bg-black text-white border-black')
                                            : 'bg-transparent border-neutral-700 hover:bg-neutral-800/50'
                                            }`}
                                    >
                                        Hoch
                                    </button>
                                </div>
                            </fieldset>

                            <div className="pt-2 border-t border-neutral-700/50 text-xs text-center">
                                <a
                                    href="https://munir.mardinli.dev/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={linkStyleClass}
                                    aria-label="Entwickler-Website munir.mardinli.dev besuchen (öffnet in neuem Tab)"
                                >
                                    munir.mardinli.dev <span aria-hidden="true">↗</span>
                                </a>
                            </div>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                        aria-expanded={isSettingsOpen}
                        aria-label="Einstellungen öffnen oder schließen"
                        className={`p-3.5 rounded-full shadow-xl border flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 ${cardBgClass}`}
                    >
                        <span aria-hidden="true">⚙️</span>
                    </button>
                </div>
            </main>
        );
    };