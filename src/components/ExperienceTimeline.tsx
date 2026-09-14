import React from 'react';
import { Award, CheckCircle2, Building, Users, Sparkles, BookOpen } from 'lucide-react';
import { experienceList } from '../data/personalData';
import { ExperienceItem } from '../types';

interface ExperienceTimelineProps {
  experiences?: ExperienceItem[];
}

export const ExperienceTimeline: React.FC<ExperienceTimelineProps> = ({
  experiences = experienceList
}) => {
  // Hanya tampilkan periode pengabdian yang aktif (isActive !== false)
  const activeExperiences = experiences.filter((exp) => exp.isActive !== false);

  if (activeExperiences.length === 0) {
    return null;
  }

  return (
    <section id="pengabdian" className="py-16 md:py-24 bg-gradient-to-b from-[#faf8f5] to-[#f4f0e6] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-semibold uppercase tracking-wider mb-3">
            <Award className="w-3.5 h-3.5 text-emerald-700" />
            <span>Rekam Jejak & Dedikasi</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#064e3b] tracking-tight">
            Perjalanan Pengabdian di Dunia Madrasah
          </h2>
          <p className="mt-3 text-sm sm:text-base text-gray-600 font-light">
            Rekam jejak konsisten dalam memajukan standar mutu pendidikan Islam, kepemimpinan madrasah, dan pembinaan guru secara berkelanjutan.
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8 relative before:absolute before:inset-0 before:left-4 md:before:left-1/2 md:before:-ml-0.5 before:w-0.5 before:bg-emerald-300">
          {activeExperiences.map((exp, index) => {
            const isEven = index % 2 === 0;
            return (
              <div
                key={exp.id}
                id={`exp-card-${exp.id}`}
                className={`relative flex flex-col md:flex-row items-start ${
                  isEven ? 'md:flex-row-reverse' : ''
                }`}
              >
                {/* Timeline Dot */}
                <div className="absolute left-4 md:left-1/2 -translate-x-1/2 top-6 w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 border-4 border-white shadow-md z-10" />

                {/* Content Card */}
                <div className="pl-8 sm:pl-10 md:pl-0 md:w-1/2 md:px-8 w-full box-border">
                  <div className="bg-white rounded-2xl p-6 sm:p-7 border border-emerald-900/10 shadow-xs hover:shadow-md transition-all duration-300 hover:border-amber-400/50 group">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                        {exp.period}
                      </span>
                      <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                        {exp.type}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-gray-900 group-hover:text-emerald-800 transition-colors">
                      {exp.role}
                    </h3>
                    <p className="text-xs sm:text-sm font-semibold text-emerald-700 mt-0.5 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5" />
                      <span>{exp.organization}</span>
                    </p>

                    <p className="text-xs sm:text-sm text-gray-600 mt-3 font-light leading-relaxed">
                      {exp.description}
                    </p>

                    {exp.achievements && exp.achievements.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-gray-100 space-y-1.5">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-900">
                          Capaian & Dampak:
                        </p>
                        {exp.achievements.map((ach, aIdx) => (
                          <div key={aIdx} className="flex items-start gap-2 text-xs text-gray-600">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{ach}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

