import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, RotateCcw, Clock, Volume2, VolumeX, CheckCircle2, ChevronRight, Bell, Settings2, Music, Waves, Plus, Trash2, X, BookMarked, Check } from 'lucide-react';
import { playTasbihSound, playRoundCompleteSound, playResetSound, TasbihSoundType, DHIKR_SOUND_PROFILES } from '../utils/audioEffects';

export interface DhikrItem {
  id?: string;
  label: string;
  arabic: string;
  meaning: string;
  soundTone: string;
  isCustom?: boolean;
  defaultTarget?: number;
}

const DEFAULT_DHIKR_OPTIONS: DhikrItem[] = [
  { 
    label: 'Subhanallah', 
    arabic: 'سُبْحَانَ اللَّهِ', 
    meaning: 'Maha Suci Allah',
    soundTone: 'Jernih Syahdu (Resonansi Kristal)'
  },
  { 
    label: 'Alhamdulillah', 
    arabic: 'الْحَمْدُ لِلَّهِ', 
    meaning: 'Segala puji bagi Allah',
    soundTone: 'Hangat Syukur (Harmoni Kayu Akustik)'
  },
  { 
    label: 'Allahu Akbar', 
    arabic: 'اللَّهُ أَكْبَرُ', 
    meaning: 'Allah Maha Besar',
    soundTone: 'Megah Khusyuk (Dentum Bedug / Jati Mantap)'
  },
  { 
    label: 'Astaghfirullah', 
    arabic: 'أَسْتَغْفِرُ اللَّهَ', 
    meaning: 'Aku memohon ampun kepada Allah',
    soundTone: 'Lembut Tawadhu (Tetes Embun Tenang)'
  },
  { 
    label: 'La ilaha illallah', 
    arabic: 'لَا إِلَهَ إِلَّا اللَّهُ', 
    meaning: 'Tiada tuhan selain Allah',
    soundTone: 'Sakral Tauhid (Harmoni Meditatif 528Hz)'
  },
  { 
    label: "Sollallohu 'Ala Muhammad", 
    arabic: 'صَلَّى اللهُ عَلَى مُحَمَّد', 
    meaning: 'Semoga Allah melimpahkan rahmat kepada Nabi Muhammad SAW',
    soundTone: 'Sholawat Barokah (Harmoni Sejuk Rahmat)'
  },
];

export const IslamicToolsWidget: React.FC = () => {
  // Tasbih State
  const [tasbihCount, setTasbihCount] = useState(0);
  const [selectedDhikr, setSelectedDhikr] = useState("Sollallohu 'Ala Muhammad");
  const [dhikrTarget, setDhikrTarget] = useState<number>(33);
  const [completedRounds, setCompletedRounds] = useState(0);
  
  // Custom Dhikr List & Add Modal State
  const [customDhikrs, setCustomDhikrs] = useState<DhikrItem[]>(() => {
    try {
      const saved = localStorage.getItem('madrasah_custom_dhikr_list');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [showAddDhikrModal, setShowAddDhikrModal] = useState(false);
  const [newDhikrLabel, setNewDhikrLabel] = useState('');
  const [newDhikrArabic, setNewDhikrArabic] = useState('');
  const [newDhikrMeaning, setNewDhikrMeaning] = useState('');
  const [newDhikrTarget, setNewDhikrTarget] = useState<number>(33);
  const [addDhikrError, setAddDhikrError] = useState('');
  const [addDhikrSuccess, setAddDhikrSuccess] = useState(false);

  // Audio & Sound Effects State
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [soundType, setSoundType] = useState<TasbihSoundType>('auto_dzikr');
  const [showSoundSettings, setShowSoundSettings] = useState(false);
  const [isTapped, setIsTapped] = useState(false);
  const [justCompletedRound, setJustCompletedRound] = useState(false);

  // Prayer times state (calculated/preset for Indonesian regions, default: Purwokerto, Jawa Tengah)
  const [selectedCity, setSelectedCity] = useState<string>('Purwokerto (Jawa Tengah)');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Save custom dhikrs to localStorage
  const handleSaveCustomDhikr = (e: React.FormEvent) => {
    e.preventDefault();
    const label = newDhikrLabel.trim();
    if (!label) {
      setAddDhikrError('Mohon isi nama atau lafadz dzikir.');
      return;
    }

    const newItem: DhikrItem = {
      id: 'custom_' + Date.now(),
      label,
      arabic: newDhikrArabic.trim() || 'ذِكْرٌ مُبَارَكٌ',
      meaning: newDhikrMeaning.trim() || `Dzikir / Wirid Santri: ${label}`,
      soundTone: 'Khidmat Kustom (Kayu Akustik Tenang)',
      isCustom: true,
      defaultTarget: newDhikrTarget,
    };

    const updated = [...customDhikrs, newItem];
    setCustomDhikrs(updated);
    try {
      localStorage.setItem('madrasah_custom_dhikr_list', JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to save custom dhikr:', err);
    }

    setSelectedDhikr(newItem.label);
    setDhikrTarget(newDhikrTarget);
    setTasbihCount(0);
    setAddDhikrSuccess(true);

    if (soundEnabled) {
      playTasbihSound(soundType, 0.8, newItem.label, voiceEnabled);
    }

    setTimeout(() => {
      setAddDhikrSuccess(false);
      setShowAddDhikrModal(false);
      setNewDhikrLabel('');
      setNewDhikrArabic('');
      setNewDhikrMeaning('');
      setAddDhikrError('');
    }, 800);
  };

  const handleDeleteCustomDhikr = (idToDelete: string, labelToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customDhikrs.filter(item => item.id !== idToDelete);
    setCustomDhikrs(updated);
    try {
      localStorage.setItem('madrasah_custom_dhikr_list', JSON.stringify(updated));
    } catch (err) {}

    if (selectedDhikr === labelToDelete) {
      setSelectedDhikr("Sollallohu 'Ala Muhammad");
      setTasbihCount(0);
    }
  };

  const prayerSchedules: Record<string, { subuh: string; terbit: string; dzuhur: string; ashar: string; maghrib: string; isya: string }> = {
    'Purwokerto (Jawa Tengah)': { subuh: '04:39', terbit: '05:54', dzuhur: '11:57', ashar: '15:17', maghrib: '17:57', isya: '19:07' },
    'Semarang (Jateng)': { subuh: '04:34', terbit: '05:50', dzuhur: '11:53', ashar: '15:12', maghrib: '17:52', isya: '19:02' },
    'Yogyakarta': { subuh: '04:36', terbit: '05:52', dzuhur: '11:54', ashar: '15:14', maghrib: '17:53', isya: '19:03' },
    'Bandung / Jabar': { subuh: '04:42', terbit: '05:58', dzuhur: '12:01', ashar: '15:21', maghrib: '18:00', isya: '19:10' },
    'Jakarta': { subuh: '04:45', terbit: '06:01', dzuhur: '12:03', ashar: '15:23', maghrib: '18:02', isya: '19:12' },
    'Surabaya': { subuh: '04:22', terbit: '05:39', dzuhur: '11:41', ashar: '15:00', maghrib: '17:39', isya: '18:49' },
    'Medan': { subuh: '05:07', terbit: '06:24', dzuhur: '12:30', ashar: '15:47', maghrib: '18:35', isya: '19:45' },
  };

  const currentSchedule = prayerSchedules[selectedCity] || prayerSchedules['Purwokerto (Jawa Tengah)'];

  // Combine Default & Custom Dhikrs
  const allDhikrOptions: DhikrItem[] = [...DEFAULT_DHIKR_OPTIONS, ...customDhikrs];

  const soundOptions: { id: TasbihSoundType; label: string; desc: string }[] = [
    { id: 'auto_dzikr', label: '✨ Sesuai Kalimat Dzikir', desc: 'Otomatis berganti nada sesuai lafadz dzikir yang dipilih' },
    { id: 'wood', label: 'Kayu Tasbih Klasik', desc: 'Ketukan butir tasbih kayu jati asli' },
    { id: 'click', label: 'Klik Taktil Digital', desc: 'Ketukan ringkas taktil lembut' },
    { id: 'bell', label: 'Lonceng Khidmat', desc: 'Dentingan suci meditatif' },
    { id: 'dew', label: 'Tetes Embun', desc: 'Suara tetesan air jernih' },
  ];

  const targetPresets = [33, 99, 100, 313, 1000];

  const handleTapTasbih = () => {
    setIsTapped(true);
    setTimeout(() => setIsTapped(false), 120);

    const next = tasbihCount + 1;

    // Play bead tap sound and speak the vocal dzikir
    if (soundEnabled) {
      playTasbihSound(soundType, 0.8, selectedDhikr, voiceEnabled);
    }

    if (dhikrTarget > 0 && next >= dhikrTarget) {
      setTasbihCount(0);
      setCompletedRounds((prev) => prev + 1);
      setJustCompletedRound(true);
      setTimeout(() => setJustCompletedRound(false), 2500);

      // Play completion chime
      if (soundEnabled) {
        setTimeout(() => {
          playRoundCompleteSound(0.85);
        }, 60);
      }
    } else {
      setTasbihCount(next);
    }
  };

  const handleResetTasbih = () => {
    if (soundEnabled) {
      playResetSound(0.6);
    }
    setTasbihCount(0);
    setCompletedRounds(0);
    setJustCompletedRound(false);
  };

  const handleTestSound = (type: TasbihSoundType) => {
    setSoundType(type);
    playTasbihSound(type, 0.8, selectedDhikr, voiceEnabled);
  };

  const activeDhikrObj = allDhikrOptions.find((d) => d.label === selectedDhikr) || allDhikrOptions[0];
  const activeProfile = DHIKR_SOUND_PROFILES[selectedDhikr] || {
    name: selectedDhikr,
    badge: 'Khasanah Santri',
    description: 'Dzikir dan wirid kustom santri madrasah',
    color: 'text-emerald-800 bg-emerald-50 border-emerald-300',
  };

  return (
    <section id="fitur-islami" className="py-16 md:py-24 bg-gradient-to-b from-[#f4f0e6] via-[#faf8f5] to-[#f4f0e6] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-800 text-amber-300 text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Khasanah & Faedah Santri</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#064e3b] tracking-tight">
            Ruang Riyadhah & Pengingat Waktu
          </h2>
          <p className="mt-3 text-sm sm:text-base text-gray-600 font-light">
            Sarana dzikir harian santri dilengkapi pelafalan suara dzikir nyata dan audio ketukan adaptif serta panduan jadwal sholat asatidz dan santri.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left: Interactive Tasbih Digital with Sound Effects */}
          <div className="lg:col-span-6 bg-white rounded-2xl p-5 sm:p-7 border border-emerald-900/10 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div>
              {/* Header with Title & Compact Control Toolbar */}
              <div className="border-b border-gray-100 pb-4 mb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-800 text-amber-300 flex items-center justify-center shrink-0 shadow-xs">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
                        Tasbih Digital Santri
                      </h3>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Ketukan melafalkan suara dzikir otomatis & bunyi adaptif
                    </p>
                  </div>
                  
                  {/* Action Toolbar */}
                  <div className="flex items-center gap-1.5 self-start sm:self-auto bg-gray-50/90 p-1 rounded-xl border border-gray-200/80">
                    {/* Sound Toggle Button */}
                    <button
                      id="tasbih-sound-toggle-btn"
                      onClick={() => {
                        const next = !soundEnabled;
                        setSoundEnabled(next);
                        if (next) playTasbihSound(soundType, 0.75, selectedDhikr, voiceEnabled);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${
                        soundEnabled
                          ? 'bg-emerald-800 text-amber-300 shadow-xs'
                          : 'bg-white text-gray-400 border border-gray-200 hover:bg-gray-100'
                      }`}
                      title={soundEnabled ? 'Suara Aktif (Klik untuk Membisukan)' : 'Suara Bisu (Klik untuk Mengaktifkan)'}
                    >
                      {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-amber-300" /> : <VolumeX className="w-3.5 h-3.5 text-gray-400" />}
                      <span className="text-[11px] whitespace-nowrap">{soundEnabled ? 'Suara ON' : 'Mute'}</span>
                    </button>

                    {/* Sound Settings Dropdown Toggle */}
                    <button
                      id="tasbih-sound-settings-btn"
                      onClick={() => setShowSoundSettings(!showSoundSettings)}
                      className={`p-1.5 rounded-lg transition-colors text-xs cursor-pointer ${
                        showSoundSettings
                          ? 'bg-emerald-800 text-amber-300'
                          : 'text-gray-600 hover:text-emerald-800 hover:bg-white'
                      }`}
                      title="Pengaturan Suara & Pelafalan Vokal Dzikir"
                    >
                      <Settings2 className="w-4 h-4" />
                    </button>

                    {/* Reset Button */}
                    <button
                      id="reset-tasbih-btn"
                      onClick={handleResetTasbih}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-800 hover:bg-white transition-colors cursor-pointer"
                      title="Reset Hitungan"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Sound Settings Panel if open */}
              {showSoundSettings && (
                <div className="mb-4 p-3.5 bg-emerald-50/90 rounded-xl border border-emerald-200 text-xs animate-fadeIn space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                      <Music className="w-3.5 h-3.5 text-emerald-700" />
                      Pengaturan Audio Tasbih:
                    </span>
                    <button
                      onClick={() => setShowSoundSettings(false)}
                      className="text-[10px] text-emerald-800 underline font-medium cursor-pointer"
                    >
                      Tutup
                    </button>
                  </div>

                  {/* Voice Recitation Toggle */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-emerald-200">
                    <div>
                      <p className="font-bold text-xs text-gray-800 flex items-center gap-1">
                        <span>🗣️ Ucapan Suara Vokal Lafadz</span>
                        {voiceEnabled && <span className="text-[10px] text-emerald-700 font-semibold">(Aktif)</span>}
                      </p>
                      <p className="text-[10px] text-gray-500">Melafalkan "{selectedDhikr}" saat tombol tasbih diketuk</p>
                    </div>
                    <button
                      onClick={() => {
                        const next = !voiceEnabled;
                        setVoiceEnabled(next);
                        if (next && soundEnabled) playTasbihSound(soundType, 0.8, selectedDhikr, true);
                      }}
                      className={`px-3 py-1 rounded-md font-bold text-xs transition-colors cursor-pointer ${
                        voiceEnabled
                          ? 'bg-emerald-800 text-amber-300'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                    >
                      {voiceEnabled ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Sound Type Selection */}
                  <div>
                    <p className="text-[11px] font-semibold text-emerald-900 mb-1.5">Karakter Efek Ketukan Butir:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {soundOptions.map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => handleTestSound(opt.id)}
                          className={`p-2 rounded-lg text-left transition-all border cursor-pointer ${
                            soundType === opt.id
                              ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                          }`}
                        >
                          <p className="font-bold text-xs flex items-center justify-between">
                            <span>{opt.label}</span>
                            {soundType === opt.id && <span className="text-[10px] text-amber-300 font-bold">✓ Terpilih</span>}
                          </p>
                          <p className={`text-[10px] mt-0.5 ${soundType === opt.id ? 'text-emerald-100' : 'text-gray-500'}`}>
                            {opt.desc}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Dhikr Selector Pills with Tambah Dzikir Button */}
              <div className="flex flex-wrap items-center gap-1.5 mb-3.5">
                {allDhikrOptions.map((opt) => {
                  const isSelected = selectedDhikr === opt.label;
                  return (
                    <div key={opt.id || opt.label} className="relative group/pill inline-flex items-center">
                      <button
                        onClick={() => {
                          setSelectedDhikr(opt.label);
                          if (opt.defaultTarget) setDhikrTarget(opt.defaultTarget);
                          setTasbihCount(0);
                          if (soundEnabled) playTasbihSound(soundType, 0.75, opt.label, voiceEnabled);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                          isSelected
                            ? 'bg-emerald-800 text-amber-300 shadow-sm ring-1 ring-amber-400/50 scale-[1.02]'
                            : 'bg-gray-100/90 text-gray-700 hover:bg-emerald-50 hover:text-emerald-900 border border-gray-200/70'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        )}
                        {opt.isCustom && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-400/20 text-amber-800 font-bold ml-0.5">
                            Kustom
                          </span>
                        )}
                      </button>

                      {/* Delete button for custom dhikrs */}
                      {opt.isCustom && opt.id && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteCustomDhikr(opt.id!, opt.label, e)}
                          className="ml-1 p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          title={`Hapus wirid kustom "${opt.label}"`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* + Tambah Dzikir Button */}
                <button
                  type="button"
                  id="tambah-dzikir-btn"
                  onClick={() => setShowAddDhikrModal(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 bg-amber-500/15 text-emerald-900 hover:bg-amber-500/25 border border-amber-400/60 shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
                  title="Tambah Wirid / Dzikir Kustom Baru"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-700 font-bold" />
                  <span>+ Tambah Dzikir</span>
                </button>
              </div>

              {/* Dhikr Arabic Display with Sound Character Profile */}
              <div className="text-center py-4 px-3 bg-gradient-to-b from-emerald-50/90 to-emerald-100/40 rounded-2xl border border-emerald-200/80 mb-4 relative shadow-xs">
                <p className="font-arabic text-3xl sm:text-4xl text-emerald-950 font-bold mb-1 leading-relaxed">
                  {activeDhikrObj.arabic}
                </p>
                <p className="text-xs sm:text-sm text-emerald-800 italic mb-2.5 font-serif">
                  "{activeDhikrObj.meaning}"
                </p>

                {/* Adaptive Sound & Voice Profile Badge */}
                <div className="inline-flex items-center flex-wrap justify-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-white/95 border border-emerald-300/80 text-emerald-900 shadow-xs">
                  <Waves className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                  <span>
                    🗣️ Lafadz Vokal: <strong>"{selectedDhikr}"</strong> | Nada: <strong>{activeProfile.badge}</strong>
                  </span>
                </div>
              </div>

              {/* Target Selector Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600 mb-3 px-1">
                <span className="font-medium text-gray-700">Target Dzikir:</span>
                <div className="flex items-center gap-1">
                  {targetPresets.map((tgt) => (
                    <button
                      key={tgt}
                      onClick={() => {
                        setDhikrTarget(tgt);
                        setTasbihCount(0);
                        if (soundEnabled) playTasbihSound(soundType, 0.5, selectedDhikr, false);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        dhikrTarget === tgt
                          ? 'bg-emerald-800 text-amber-300 shadow-xs ring-1 ring-amber-400/40'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200/60'
                      }`}
                    >
                      {tgt}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tap Button Center with Ripple and Sound Feedback */}
            <div className="flex flex-col items-center justify-center my-3 relative">
              {/* Completion Banner */}
              {justCompletedRound && (
                <div className="absolute -top-6 bg-amber-400 text-emerald-950 font-bold text-xs px-3.5 py-1 rounded-full shadow-md animate-bounce flex items-center gap-1.5 z-20">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-900" />
                  <span>Alhamdulillah! Target Selesai 🎉</span>
                </div>
              )}

              <button
                id="tasbih-tap-button"
                onClick={handleTapTasbih}
                className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-950 text-white shadow-xl hover:shadow-2xl active:scale-95 transition-all flex flex-col items-center justify-center border-4 ${
                  isTapped ? 'border-amber-300 scale-95 ring-8 ring-amber-300/30' : 'border-amber-400/90 hover:border-amber-300'
                } group focus:outline-none select-none cursor-pointer relative overflow-hidden`}
              >
                {/* Visual pulse glow on tap */}
                <div
                  className={`absolute inset-0 bg-amber-400/20 rounded-full transition-opacity pointer-events-none ${
                    isTapped ? 'opacity-100 scale-110' : 'opacity-0'
                  }`}
                />

                <span className="text-4xl sm:text-5xl font-black text-amber-300 tracking-tight font-mono drop-shadow-xs">
                  {tasbihCount}
                </span>
                <span className="text-[11px] uppercase tracking-wider text-emerald-200 mt-1 font-semibold group-hover:text-amber-200 flex items-center gap-1 text-center px-2">
                  <span>{selectedDhikr}</span>
                  {soundEnabled && <Volume2 className="w-3.5 h-3.5 text-amber-300 animate-pulse shrink-0" />}
                </span>
              </button>

              <p className="text-[11px] text-gray-500 mt-2.5 font-medium text-center">
                Ketuk tombol untuk melafalkan suara <strong>"{selectedDhikr}"</strong> & menambah hitungan
              </p>
            </div>

            {/* Bottom Target Progress */}
            <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <span>Target: <strong className="text-gray-900">{dhikrTarget} kali</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>Putaran Selesai: <strong className="text-emerald-800">{completedRounds} putaran</strong></span>
              </div>
            </div>
          </div>

          {/* Right: Jadwal Sholat & Waktu Ibadah */}
          <div className="lg:col-span-6 bg-gradient-to-br from-[#064e3b] to-[#04362a] text-white rounded-2xl p-6 sm:p-8 border-2 border-amber-500/40 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-700/60 pb-4 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-400" />
                    <span>Jadwal Waktu Sholat</span>
                  </h3>
                  <p className="text-xs text-emerald-200 font-light">
                    {currentTime.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>

                {/* City Select */}
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="bg-emerald-900 border border-amber-400/40 text-amber-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none cursor-pointer"
                >
                  <option value="Purwokerto (Jawa Tengah)">📍 Purwokerto (Jateng) — Default</option>
                  <option value="Semarang (Jateng)">Semarang / Solo (Jateng)</option>
                  <option value="Yogyakarta">DI Yogyakarta</option>
                  <option value="Bandung / Jabar">Bandung / Jabar</option>
                  <option value="Jakarta">DKI Jakarta</option>
                  <option value="Surabaya">Surabaya / Jatim</option>
                  <option value="Medan">Medan / Sumut</option>
                </select>
              </div>

              {/* Prayer Times Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-4">
                <div className="bg-emerald-900/70 p-3.5 rounded-xl border border-emerald-700/50 text-center">
                  <p className="text-[11px] uppercase tracking-wider text-emerald-300 font-medium">Subuh</p>
                  <p className="text-lg sm:text-xl font-bold text-amber-300 font-mono mt-0.5">{currentSchedule.subuh}</p>
                </div>
                <div className="bg-emerald-900/70 p-3.5 rounded-xl border border-emerald-700/50 text-center">
                  <p className="text-[11px] uppercase tracking-wider text-emerald-300 font-medium">Terbit / Syuruq</p>
                  <p className="text-lg sm:text-xl font-bold text-emerald-100 font-mono mt-0.5">{currentSchedule.terbit}</p>
                </div>
                <div className="bg-emerald-900/70 p-3.5 rounded-xl border border-emerald-700/50 text-center">
                  <p className="text-[11px] uppercase tracking-wider text-emerald-300 font-medium">Dzuhur</p>
                  <p className="text-lg sm:text-xl font-bold text-amber-300 font-mono mt-0.5">{currentSchedule.dzuhur}</p>
                </div>
                <div className="bg-emerald-900/70 p-3.5 rounded-xl border border-emerald-700/50 text-center">
                  <p className="text-[11px] uppercase tracking-wider text-emerald-300 font-medium">Ashar</p>
                  <p className="text-lg sm:text-xl font-bold text-amber-300 font-mono mt-0.5">{currentSchedule.ashar}</p>
                </div>
                <div className="bg-emerald-900/70 p-3.5 rounded-xl border border-emerald-700/50 text-center">
                  <p className="text-[11px] uppercase tracking-wider text-emerald-300 font-medium">Maghrib</p>
                  <p className="text-lg sm:text-xl font-bold text-amber-300 font-mono mt-0.5">{currentSchedule.maghrib}</p>
                </div>
                <div className="bg-emerald-900/70 p-3.5 rounded-xl border border-emerald-700/50 text-center">
                  <p className="text-[11px] uppercase tracking-wider text-emerald-300 font-medium">Isya</p>
                  <p className="text-lg sm:text-xl font-bold text-amber-300 font-mono mt-0.5">{currentSchedule.isya}</p>
                </div>
              </div>
            </div>

            {/* Doa & Hadith Reminder Box */}
            <div className="mt-4 p-4 rounded-xl bg-emerald-950/80 border border-emerald-700/60">
              <p className="text-xs text-amber-300 font-semibold mb-1">
                Adab Menuntut Ilmu & Menjaga Sholat Berjamaah:
              </p>
              <p className="text-xs text-emerald-100 italic leading-relaxed">
                "Kunci keberkahan madrasah terletak pada dawamnya sholat berjamaah di awal waktu dan hidupnya majelis ilmu."
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Tambah Dzikir / Wirid Kustom */}
      {showAddDhikrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-emerald-100 relative max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                setShowAddDhikrModal(false);
                setAddDhikrError('');
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-emerald-800 text-amber-300 flex items-center justify-center shadow-xs">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Tambah Dzikir & Wirid Kustom</h3>
                <p className="text-xs text-gray-500">Tambahkan doa, sholawat, atau wirid harian santri ke tasbih</p>
              </div>
            </div>

            {/* Quick Suggestions Pills */}
            <div className="mb-4 p-3 bg-emerald-50/70 rounded-xl border border-emerald-100">
              <p className="text-[11px] font-semibold text-emerald-900 mb-2 flex items-center gap-1">
                <BookMarked className="w-3.5 h-3.5 text-emerald-700" />
                <span>Pilihan Cepat (Klik untuk Mengisi Otomatis):</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  {
                    label: 'Hasbunallah Wanikmal Wakil',
                    arabic: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ',
                    meaning: 'Cukuplah Allah menjadi Penolong kami dan Allah adalah sebaik-baik Pelindung',
                    target: 100
                  },
                  {
                    label: 'La Haula Wala Quwwata Illa Billah',
                    arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
                    meaning: 'Tiada daya dan kekuatan kecuali dengan pertolongan Allah',
                    target: 33
                  },
                  {
                    label: 'Ya Hayyu Ya Qoyyum',
                    arabic: 'يَا حَيُّ يَا قَيُّومُ',
                    meaning: 'Wahai Yang Maha Hidup, Wahai Yang Maha Berdiri Sendiri',
                    target: 100
                  },
                  {
                    label: 'Robbi Zidni Ilma',
                    arabic: 'رَبِّ زِدْنِي عِلْمًا',
                    meaning: 'Ya Tuhanku, tambahkanlah kepadaku ilmu pengetahuan',
                    target: 33
                  },
                  {
                    label: 'Sholawat Tibbil Qulub',
                    arabic: 'اللّٰهُمَّ صَلِّ عَلَى سَيِّدِنَا مُحَمَّدٍ طِبِّ الْقُلُوْبِ وَدَوَائِهَا',
                    meaning: 'Sholawat penyejuk & obat bagi hati yang gundah',
                    target: 33
                  },
                ].map((sug) => (
                  <button
                    key={sug.label}
                    type="button"
                    onClick={() => {
                      setNewDhikrLabel(sug.label);
                      setNewDhikrArabic(sug.arabic);
                      setNewDhikrMeaning(sug.meaning);
                      setNewDhikrTarget(sug.target);
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-800 hover:text-amber-300 font-medium transition-all cursor-pointer shadow-2xs"
                  >
                    + {sug.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveCustomDhikr} className="space-y-3.5">
              {/* Nama / Lafadz Latin */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nama / Lafadz Dzikir (Latin) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Hasbunallah Wanikmal Wakil, Ya Fattahu Ya Rozzaq"
                  value={newDhikrLabel}
                  onChange={(e) => setNewDhikrLabel(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-600 focus:border-transparent outline-none"
                />
              </div>

              {/* Teks Arab */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Teks Arab (Kaligrafi) <span className="text-gray-400 font-normal">(Opsional)</span>
                </label>
                <input
                  type="text"
                  dir="rtl"
                  placeholder="Contoh: حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ"
                  value={newDhikrArabic}
                  onChange={(e) => setNewDhikrArabic(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm font-arabic focus:ring-2 focus:ring-emerald-600 focus:border-transparent outline-none text-right"
                />
              </div>

              {/* Arti / Terjemahan */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Arti / Keutamaan Dzikir <span className="text-gray-400 font-normal">(Opsional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Cukuplah Allah menjadi Penolong kami"
                  value={newDhikrMeaning}
                  onChange={(e) => setNewDhikrMeaning(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-600 focus:border-transparent outline-none"
                />
              </div>

              {/* Target Hitungan */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Target Hitungan Awal
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[33, 99, 100, 313, 1000].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewDhikrTarget(t)}
                      className={`py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        newDhikrTarget === t
                          ? 'bg-emerald-800 text-amber-300 border-emerald-900 shadow-xs'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {t}x
                    </button>
                  ))}
                </div>
              </div>

              {addDhikrError && (
                <p className="text-xs text-red-600 font-medium bg-red-50 p-2 rounded-lg border border-red-200">
                  {addDhikrError}
                </p>
              )}

              {addDhikrSuccess && (
                <p className="text-xs text-emerald-800 font-bold bg-emerald-100 p-2 rounded-lg border border-emerald-300 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-700" />
                  <span>Alhamdulillah, wirid kustom berhasil ditambahkan & aktif!</span>
                </p>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddDhikrModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-800 text-amber-300 hover:bg-emerald-900 shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Simpan & Gunakan di Tasbih</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
