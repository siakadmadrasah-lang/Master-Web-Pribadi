import React, { useState } from 'react';
import { BookOpen, GraduationCap, Copy, Check, Sparkles, ChevronRight, Award, Compass, HeartHandshake } from 'lucide-react';
import { profileData, educationHistory, quotesList } from '../data/personalData';
import { ProfileInfo, EducationItem, Quote } from '../types';

interface AboutSectionProps {
  profile?: ProfileInfo;
  education?: EducationItem[];
  quotes?: Quote[];
}

export const AboutSection: React.FC<AboutSectionProps> = ({
  profile = profileData,
  education = educationHistory,
  quotes = quotesList,
}) => {
  const [selectedQuoteIdx, setSelectedQuoteIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  const currentQuote = (quotes && quotes.length > 0) ? quotes[selectedQuoteIdx % quotes.length] : quotesList[0];

  const handleCopyQuote = () => {
    if (!currentQuote) return;
    const text = `"${currentQuote.arabicText}"\n\nArtinya: "${currentQuote.translation}" (${currentQuote.source})\n\n— Dikutip dari Website ${profile.name}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const nextQuote = () => {
    if (quotes && quotes.length > 0) {
      setSelectedQuoteIdx((prev) => (prev + 1) % quotes.length);
    }
  };

  return (
    <section id="profil" className="py-16 md:py-24 bg-[#faf8f5] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/80 border border-emerald-300 text-emerald-800 text-xs font-semibold uppercase tracking-wider mb-3">
            <Compass className="w-3.5 h-3.5 text-emerald-700" />
            <span>Biografi & Visi Keilmuan</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#064e3b] tracking-tight">
            Mendedikasikan Hidup untuk Kemuliaan Ilmu & Akhlak
          </h2>
          <p className="mt-3 text-sm sm:text-base text-gray-600 leading-relaxed font-light">
            {profile.tagline || "Menghubungkan mata rantai tradisi keilmuan Islam nusantara dengan tuntutan kecakapan abad ke-21 melalui inovasi madrasah yang beradab dan berdaya saing."}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Column: Personal Narrative */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-emerald-900/10 shadow-xs space-y-4">
              <h3 className="text-xl font-bold text-emerald-950 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-emerald-700" />
                <span>Kiprah & Komitmen Pendidikan</span>
              </h3>
              
              <div className="text-gray-700 leading-relaxed text-sm sm:text-base space-y-3 whitespace-pre-line">
                {profile.bio || (
                  <p>
                    Lebih dari 15 tahun mendedikasikan diri dalam dunia pendidikan Islam, pengembangan kurikulum madrasah terpadu, serta pembinaan akhlak santri dan generasi muda. Berkomitmen menghadirkan ekosistem madrasah yang adaptif terhadap sains-teknologi modern tanpa mencabut akar tradisi keilmuan Islam dan kearifan pesantren.
                  </p>
                )}
              </div>

              {/* Highlight Box */}
              <div className="p-4 rounded-xl bg-emerald-50/80 border-l-4 border-emerald-700 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                  Prinsip Utama Pengajaran:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-emerald-900">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    <span>Adab Mendahului Ilmu</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    <span>Keteladanan Sebelum Instruksi</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    <span>Keseimbangan Dzikir & Fikir</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    <span>Mencetak Insan Rahmatan lil 'Alamin</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Riwayat Pendidikan Timeline */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-emerald-900/10 shadow-xs space-y-5">
              <h3 className="text-xl font-bold text-emerald-950 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-600" />
                <span>Riwayat Pendidikan & Sanad Keilmuan</span>
              </h3>

              <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-emerald-200">
                {education.map((edu, idx) => (
                  <div key={idx} className="relative pl-8 group">
                    <div className="absolute left-2 top-1.5 w-3.5 h-3.5 rounded-full bg-emerald-700 border-2 border-white shadow-xs group-hover:scale-125 transition-transform" />
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {edu.year}
                    </span>
                    <h4 className="text-sm sm:text-base font-bold text-gray-900 mt-1">
                      {edu.degree}
                    </h4>
                    <p className="text-xs sm:text-sm text-gray-600 font-medium">
                      {edu.institution}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {edu.focus || edu.field}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Kalam & Mutiara Hikmah Widget */}
          <div className="lg:col-span-5 space-y-6">
            {currentQuote && (
              <div className="bg-gradient-to-br from-[#064e3b] to-[#043327] text-white p-6 sm:p-8 rounded-2xl border-2 border-amber-500/40 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 font-arabic text-8xl pointer-events-none select-none">
                  علم
                </div>

                <div className="flex items-center justify-between border-b border-emerald-700/60 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                      Kalam & Mutiara Hikmah
                    </span>
                  </div>
                  <span className="text-[11px] bg-emerald-800 text-amber-200 px-2 py-0.5 rounded-full border border-amber-500/30">
                    {quotes && quotes.length > 0 ? (selectedQuoteIdx % quotes.length) + 1 : 1} dari {quotes ? quotes.length : 1}
                  </span>
                </div>

                {/* Arabic Quote Display */}
                <div className="my-6 text-center space-y-4">
                  <p className="font-arabic text-xl sm:text-2xl lg:text-3xl text-amber-200 leading-loose drop-shadow-xs dir-rtl">
                    {currentQuote.arabicText}
                  </p>
                  <div className="w-16 h-0.5 bg-amber-400/40 mx-auto" />
                  <p className="text-xs sm:text-sm text-emerald-100 italic leading-relaxed">
                    "{currentQuote.translation}"
                  </p>
                  <p className="text-xs font-semibold text-amber-300">
                    — {currentQuote.source}
                  </p>
                </div>

                {/* Quote Actions */}
                <div className="pt-4 border-t border-emerald-700/60 flex items-center justify-between gap-2">
                  <button
                    id="copy-quote-btn"
                    onClick={handleCopyQuote}
                    className="px-3 py-2 rounded-lg bg-emerald-800/80 hover:bg-emerald-700 text-xs text-emerald-100 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-amber-300" />
                        <span>Salin Kutipan</span>
                      </>
                    )}
                  </button>

                  {quotes && quotes.length > 1 && (
                    <button
                      id="next-quote-btn"
                      onClick={nextQuote}
                      className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-emerald-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                    >
                      <span>Kalam Selanjutnya</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Quick Contact & Consultation Banner */}
            <div className="bg-white p-6 rounded-2xl border border-emerald-900/10 shadow-xs space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold shrink-0">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">
                    Fasilitasi Workshop & Bimbingan Madrasah
                  </h4>
                  <p className="text-xs text-gray-500">
                    Terbuka untuk kolaborasi institusi dan pendampingan akreditasi.
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-600">
                Hubungi langsung melalui {profile.email} atau WhatsApp untuk penjadwalan narasumber seminar, bedah kurikulum Kemenag, atau pelatihan motivasi santri.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

