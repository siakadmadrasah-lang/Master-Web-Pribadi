import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, MessageSquare, CheckCircle2, HeartHandshake, Copy, Check } from 'lucide-react';
import { profileData } from '../data/personalData';
import { ProfileInfo } from '../types';

interface ContactSectionProps {
  profile?: ProfileInfo;
}

export const ContactSection: React.FC<ContactSectionProps> = ({
  profile = profileData
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    institution: '',
    purpose: 'Undangan Narasumber / Kajian',
    message: '',
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);

    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: formData.name,
          institution: formData.institution,
          email: formData.email,
          phone: formData.phone,
          eventType: formData.purpose,
          message: formData.message,
          date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
        })
      });
    } catch (err) {
      console.warn('Could not post message to server API', err);
    }

    setTimeout(() => {
      setIsSubmitted(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        institution: '',
        purpose: 'Undangan Narasumber / Kajian',
        message: '',
      });
    }, 4000);
  };

  const copyEmail = () => {
    navigator.clipboard.writeText(profile.email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const copyPhone = () => {
    navigator.clipboard.writeText(profile.phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const cleanPhone = (profile.phone || '').replace(/[^0-9]/g, '');
  const waPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : (cleanPhone.startsWith('62') ? cleanPhone : '6281234567890');

  return (
    <section id="kontak" className="py-16 md:py-24 bg-gradient-to-b from-[#faf8f5] to-[#f3efe6] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-semibold uppercase tracking-wider mb-3">
            <HeartHandshake className="w-3.5 h-3.5 text-emerald-700" />
            <span>Pintu Silaturahmi</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#064e3b] tracking-tight">
            Menjalin Ukhuwah & Kolaborasi Pendidikan
          </h2>
          <p className="mt-3 text-sm sm:text-base text-gray-600 font-light">
            Silakan kirimkan undangan kegiatan madrasah, permohonan narasumber pelatihan guru, konsultasi kurikulum, atau sekadar menyambung tali silaturahmi.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Info Column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-gradient-to-br from-[#064e3b] to-[#043327] text-white p-6 sm:p-8 rounded-2xl border-2 border-amber-500/40 shadow-xl space-y-6">
              <div>
                <p className="font-arabic text-2xl text-amber-300 mb-1">
                  السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ
                </p>
                <h3 className="text-lg font-bold text-white">
                  {profile.title || profile.name}
                </h3>
                <p className="text-xs text-emerald-200 mt-1">
                  {profile.role} — {profile.institution}
                </p>
              </div>

              <div className="space-y-4 pt-4 border-t border-emerald-700/60 text-xs sm:text-sm">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-800 text-amber-300 shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] text-emerald-300">Surat Elektronik (Email)</p>
                    <p className="font-semibold text-white break-all">{profile.email}</p>
                    <button
                      id="copy-email-btn"
                      onClick={copyEmail}
                      className="text-[11px] text-amber-300 hover:underline mt-0.5 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedEmail ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedEmail ? 'Tersalin' : 'Salin Email'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-800 text-amber-300 shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] text-emerald-300">WhatsApp & Kontak Resmi</p>
                    <p className="font-semibold text-white">{profile.phone}</p>
                    <button
                      id="copy-phone-btn"
                      onClick={copyPhone}
                      className="text-[11px] text-amber-300 hover:underline mt-0.5 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedPhone ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedPhone ? 'Tersalin' : 'Salin Nomor'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-800 text-amber-300 shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] text-emerald-300">Domisili & Wilayah Kerja</p>
                    <p className="font-semibold text-white">{profile.location}</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-emerald-700/60">
                <a
                  href={`https://wa.me/${waPhone}?text=${encodeURIComponent(`Assalamu'alaikum Wr. Wb. ${profile.name}, saya ingin bersilaturahmi terkait...`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Chat Langsung via WhatsApp</span>
                </a>
              </div>
            </div>
          </div>

          {/* Right Form Column */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-emerald-900/10 shadow-xs">
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                Formulir Silaturahmi & Undangan
              </h3>
              <p className="text-xs text-gray-500 mb-6">
                Mohon lengkapi detail informasi di bawah ini agar kami dapat memberikan tanggapan dengan baik.
              </p>

              {isSubmitted ? (
                <div className="p-6 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-2 animate-fadeIn">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                  <h4 className="text-base font-bold text-emerald-900">
                    Jazakumullah Khairan Katsiran!
                  </h4>
                  <p className="text-xs sm:text-sm text-emerald-700">
                    Pesan dan undangan Anda telah berhasil terkirim. Kami akan segera menghubungi Anda kembali melalui WhatsApp atau Email.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Nama Lengkap / Gelar *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Contoh: Jaenal Maskun, S.Pd.I."
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Lembaga / Madrasah / Instansi *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.institution}
                        onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                        placeholder="Contoh: MI Ma'arif NU 2 Sanggreman"
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Alamat Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="nama@domain.com"
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Nomor WhatsApp Aktif *
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="0812xxxxxxxx"
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Kategori Keperluan / Acara
                    </label>
                    <select
                      value={formData.purpose}
                      onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-white"
                    >
                      <option value="Undangan Narasumber / Kajian">Undangan Narasumber / Kajian</option>
                      <option value="Pelatihan / Workshop Guru Madrasah">Pelatihan / Workshop Guru Madrasah</option>
                      <option value="Konsultasi Kurikulum & Akreditasi">Konsultasi Kurikulum & Akreditasi</option>
                      <option value="Bedah Buku / Penulisan Karya">Bedah Buku / Penulisan Karya</option>
                      <option value="Silaturahmi Pribadi / Santri">Silaturahmi Pribadi / Santri</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Pesan / Detail Rencana Kegiatan *
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Tuliskan estimasi tanggal, lokasi acara, dan gambaran umum tema yang hendak diangkat..."
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    />
                  </div>

                  <button
                    type="submit"
                    id="submit-contact-form-btn"
                    className="w-full py-3 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <Send className="w-4 h-4 text-amber-300" />
                    <span>Kirim Pesan Silaturahmi</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
