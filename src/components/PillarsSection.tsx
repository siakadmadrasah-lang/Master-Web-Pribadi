import React from 'react';
import { HeartHandshake, BookOpenCheck, Sparkles, ShieldCheck, CheckCircle } from 'lucide-react';
import { corePillars } from '../data/personalData';
import { CorePillarItem } from '../types';

interface PillarsSectionProps {
  pillars?: CorePillarItem[];
}

export const PillarsSection: React.FC<PillarsSectionProps> = ({ pillars = corePillars }) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'HeartHandshake':
        return <HeartHandshake className="w-6 h-6 text-amber-600" />;
      case 'BookOpenCheck':
        return <BookOpenCheck className="w-6 h-6 text-amber-600" />;
      case 'Sparkles':
        return <Sparkles className="w-6 h-6 text-amber-600" />;
      case 'ShieldCheck':
        return <ShieldCheck className="w-6 h-6 text-amber-600" />;
      default:
        return <CheckCircle className="w-6 h-6 text-amber-600" />;
    }
  };

  return (
    <section id="pilar" className="py-16 md:py-24 bg-gradient-to-b from-[#f5f2eb] to-[#faf8f5] relative border-t border-b border-emerald-900/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-800 text-amber-300 text-xs font-semibold uppercase tracking-wider mb-3 shadow-xs">
            <span>Nilai-Nilai Luhur</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#064e3b] tracking-tight">
            Pilar Transformasi Pendidikan Madrasah
          </h2>
          <p className="mt-3 text-sm sm:text-base text-gray-600 font-light">
            Konsep holistik yang mengintegrasikan kesucian hati, ketajaman intelektual, dan ketangkasan teknologi dalam ekosistem madrasah modern.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pillars.map((pillar, idx) => (
            <div
              key={idx}
              id={`pillar-card-${idx}`}
              className="bg-white rounded-2xl p-6 sm:p-7 border border-emerald-900/10 shadow-sm hover:shadow-md hover:border-amber-500/50 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden"
            >
              {/* Top Accent Line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 to-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />

              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 group-hover:bg-amber-100 border border-amber-200/80 flex items-center justify-center transition-colors">
                    {getIcon(pillar.icon)}
                  </div>
                  <span className="text-xs font-bold font-mono text-emerald-800/40">
                    0{idx + 1}
                  </span>
                </div>

                {pillar.arabic && (
                  <p className="font-arabic text-lg text-emerald-900/80 mb-1 font-semibold">
                    {pillar.arabic}
                  </p>
                )}
                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-emerald-800 transition-colors">
                  {pillar.title}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed font-light">
                  {pillar.desc}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center text-xs font-semibold text-emerald-800 group-hover:text-amber-700">
                <span>Implementasi Kurikulum & Adab</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

