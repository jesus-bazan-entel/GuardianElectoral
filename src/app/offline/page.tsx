export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 bg-amber-100 rounded-full mx-auto mb-4 flex items-center justify-center">
          <svg className="w-10 h-10 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728m-3.536-3.536a4 4 0 010-5.656M12 12h.01" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900">Sin conexión</h1>
        <p className="text-gray-500 mt-2 text-sm">
          No hay conexión a internet. La aplicación necesita cargarse al menos una vez con conexión.
        </p>
        <p className="text-gray-400 mt-4 text-xs">
          Verifica tu conexión e intenta de nuevo.
        </p>
      </div>
    </div>
  );
}
