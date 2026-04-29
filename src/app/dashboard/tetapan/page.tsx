'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, School, Percent, CreditCard, Plus, Trash2, BookOpen } from 'lucide-react'

interface SchoolData {
  id: string
  name: string
  code: string
  address: string | null
  phone: string | null
  bank_name: string | null
  bank_account_no: string | null
  bank_account_name: string | null
  bank_reference_note: string | null
}

interface FeeType {
  id: string
  name: string
  type: string
}

interface Preset {
  id: string
  year_level: number
  fee_type_id: string | null
  description: string
  default_amount: number
  is_active: boolean
}

type Tab = 'sekolah' | 'bank' | 'yuran'
type SaveState = 'idle' | 'saving' | 'saved'

const YEAR_LEVELS = [1, 2, 3, 4, 5, 6]

export default function TetapanPage() {
  const supabase = useRef(createClient()).current
  const [tab, setTab] = useState<Tab>('sekolah')
  const [school, setSchool] = useState<SchoolData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [error, setError] = useState<string | null>(null)

  // Sekolah fields
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('sriti.kajang@gmail.com')

  // Bank fields
  const [bankName, setBankName] = useState('')
  const [bankAccountNo, setBankAccountNo] = useState('')
  const [bankAccountName, setBankAccountName] = useState('')
  const [bankReferenceNote, setBankReferenceNote] = useState('')

  // Yuran presets
  const [activeYear, setActiveYear] = useState(1)
  const [presets, setPresets] = useState<Preset[]>([])
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([])
  const [presetsLoading, setPresetsLoading] = useState(false)
  const [newFeeTypeId, setNewFeeTypeId] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [addingPreset, setAddingPreset] = useState(false)
  const schoolIdRef = useRef<string | null>(null)

  const fetchSchool = useCallback(async () => {
    setLoading(true)
    const { data: sid } = await supabase.rpc('get_user_school_id')
    schoolIdRef.current = sid
    if (!sid) { setLoading(false); return }

    const { data: s } = await supabase
      .from('schools')
      .select('id, name, code, address, phone, bank_name, bank_account_no, bank_account_name, bank_reference_note')
      .eq('id', sid)
      .single()

    if (s) {
      setSchool(s)
      setName(s.name ?? '')
      setAddress(s.address ?? '')
      setPhone(s.phone ?? '')
      setBankName(s.bank_name ?? '')
      setBankAccountNo(s.bank_account_no ?? '')
      setBankAccountName(s.bank_account_name ?? '')
      setBankReferenceNote(s.bank_reference_note ?? '')
    }
    setLoading(false)
  }, [supabase])

  const fetchFeeTypes = useCallback(async () => {
    const { data } = await supabase.from('fee_types').select('id, name, type').eq('is_active', true).order('name')
    setFeeTypes(data ?? [])
  }, [supabase])

  const fetchPresets = useCallback(async () => {
    if (!schoolIdRef.current) return
    setPresetsLoading(true)
    const { data } = await supabase
      .from('fee_presets')
      .select('id, year_level, fee_type_id, description, default_amount, is_active')
      .eq('school_id', schoolIdRef.current)
      .order('year_level')
      .order('default_amount', { ascending: false })
    setPresets(data ?? [])
    setPresetsLoading(false)
  }, [supabase])

  useEffect(() => { fetchSchool() }, [fetchSchool])

  useEffect(() => {
    if (tab === 'yuran') {
      fetchFeeTypes()
      fetchPresets()
    }
  }, [tab, fetchFeeTypes, fetchPresets])

  async function handleSave() {
    if (!school) return
    setSaveState('saving')
    setError(null)

    const updates = tab === 'sekolah'
      ? { name: name.trim(), address: address.trim() || null, phone: phone.trim() || null }
      : {
          bank_name: bankName.trim() || null,
          bank_account_no: bankAccountNo.trim() || null,
          bank_account_name: bankAccountName.trim() || null,
          bank_reference_note: bankReferenceNote.trim() || null,
        }

    const { error: err } = await supabase.from('schools').update(updates).eq('id', school.id)

    if (err) {
      setError('Gagal simpan. Cuba lagi.')
      setSaveState('idle')
    } else {
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2500)
    }
  }

  async function handleAddPreset() {
    if (!newDesc.trim() || !newAmount || !schoolIdRef.current) return
    setAddingPreset(true)
    await supabase.from('fee_presets').insert({
      school_id: schoolIdRef.current,
      year_level: activeYear,
      fee_type_id: newFeeTypeId || null,
      description: newDesc.trim(),
      default_amount: parseFloat(newAmount),
      is_active: true,
    })
    setNewFeeTypeId('')
    setNewDesc('')
    setNewAmount('')
    await fetchPresets()
    setAddingPreset(false)
  }

  async function handleTogglePreset(id: string, current: boolean) {
    await supabase.from('fee_presets').update({ is_active: !current }).eq('id', id)
    setPresets(prev => prev.map(p => p.id === id ? { ...p, is_active: !current } : p))
  }

  async function handleDeletePreset(id: string) {
    await supabase.from('fee_presets').delete().eq('id', id)
    setPresets(prev => prev.filter(p => p.id !== id))
  }

  function onFeeTypeSelect(feeTypeId: string) {
    setNewFeeTypeId(feeTypeId)
    const ft = feeTypes.find(f => f.id === feeTypeId)
    if (ft && !newDesc) setNewDesc(ft.name)
  }

  const yearPresets = presets.filter(p => p.year_level === activeYear)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-green-700 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Tetapan Sistem</h2>
          <p className="text-xs text-gray-500 font-medium">Urus konfigurasi sekolah, yuran, dan bayaran</p>
        </div>
        {tab !== 'yuran' && (
          <div className="flex items-center gap-3">
            <p className="text-xs text-gray-400 mr-2">
              {saveState === 'saved' && <span className="text-green-600 font-medium">Perubahan disimpan</span>}
              {error && <span className="text-red-500 font-medium">{error}</span>}
            </p>
            <button
              onClick={handleSave}
              disabled={saveState === 'saving'}
              className="flex items-center gap-2 px-6 py-2 rounded-lg text-white text-sm font-medium transition active:scale-95 disabled:opacity-60 shadow-sm"
              style={{ backgroundColor: '#0B4233' }}
            >
              <Save size={14} />
              {saveState === 'saving' ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Nav */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <nav className="space-y-1">
            {([
              ['sekolah', 'Maklumat Sekolah', School],
              ['yuran', 'Tetapan Yuran', BookOpen],
              ['bank', 'Kaedah Bayaran', CreditCard],
            ] as [Tab, string, React.ElementType][]).map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => { setTab(key); setError(null); setSaveState('idle') }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  tab === key ? 'bg-[#E8F5E9] text-[#0B4233]' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon size={18} className={tab === key ? 'text-[#0B4233]' : 'text-gray-400'} />
                {label}
              </button>
            ))}
            <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg text-gray-400 cursor-not-allowed">
              <Percent size={18} className="text-gray-300" />
              <span className="text-gray-400">Diskaun</span>
              <span className="ml-auto text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Soon</span>
            </button>
          </nav>
        </div>

        {/* Right Content */}
        <div className="flex-1">

          {/* Tab: Sekolah */}
          {tab === 'sekolah' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:p-8">
              <h3 className="text-base font-bold text-gray-900 mb-6">Maklumat Sekolah</h3>
              <div className="space-y-6 max-w-2xl">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nama Sekolah</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-[#0B4233] transition" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Alamat</label>
                  <textarea value={address} onChange={e => setAddress(e.target.value)} rows={2}
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-[#0B4233] transition resize-none" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">No. Telefon</label>
                    <input type="text" value={phone} onChange={e => setPhone(e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-[#0B4233] transition" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-[#0B4233] transition" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Tetapan Yuran */}
          {tab === 'yuran' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-base font-bold text-gray-900 mb-1">Tetapan Yuran Mengikut Tahun</h3>
                <p className="text-sm text-gray-500 mb-5">Item yuran akan diisi secara automatik apabila admin memilih pelajar dalam Jana Invois.</p>

                {/* Year tabs */}
                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
                  {YEAR_LEVELS.map(yr => (
                    <button
                      key={yr}
                      onClick={() => setActiveYear(yr)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                        activeYear === yr ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Tahun {yr}
                    </button>
                  ))}
                </div>

                {/* Preset list */}
                {presetsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-5 h-5 border-2 border-gray-200 border-t-green-700 rounded-full animate-spin" />
                  </div>
                ) : yearPresets.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-gray-200 rounded-xl mb-4">
                    <p className="text-sm text-gray-400">Tiada item untuk Tahun {activeYear}</p>
                    <p className="text-xs text-gray-400 mt-1">Tambah item di bawah</p>
                  </div>
                ) : (
                  <div className="border border-gray-100 rounded-xl overflow-hidden mb-4">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="text-left text-xs font-semibold text-gray-500 px-4 py-2.5">Keterangan</th>
                          <th className="text-left text-xs font-semibold text-gray-500 px-4 py-2.5">Jenis</th>
                          <th className="text-right text-xs font-semibold text-gray-500 px-4 py-2.5">RM</th>
                          <th className="text-center text-xs font-semibold text-gray-500 px-4 py-2.5">Aktif</th>
                          <th className="px-4 py-2.5" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {yearPresets.map(preset => {
                          const ft = feeTypes.find(f => f.id === preset.fee_type_id)
                          return (
                            <tr key={preset.id} className={`transition-colors ${!preset.is_active ? 'opacity-40' : ''}`}>
                              <td className="px-4 py-3 text-sm text-gray-900">{preset.description}</td>
                              <td className="px-4 py-3">
                                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                                  {ft?.name ?? '—'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                                RM {preset.default_amount.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => handleTogglePreset(preset.id, preset.is_active)}
                                  className={`w-9 h-5 rounded-full transition-colors relative ${preset.is_active ? 'bg-green-600' : 'bg-gray-300'}`}
                                >
                                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${preset.is_active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                </button>
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => handleDeletePreset(preset.id)}
                                  className="p-1 text-gray-300 hover:text-red-400 transition"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Add new preset */}
                <div className="border border-dashed border-gray-200 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-500">+ Tambah Item untuk Tahun {activeYear}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <select
                      value={newFeeTypeId}
                      onChange={e => onFeeTypeSelect(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none text-gray-700"
                    >
                      <option value="">Pilih jenis yuran</option>
                      {feeTypes.map(ft => (
                        <option key={ft.id} value={ft.id}>{ft.name}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Keterangan item"
                      value={newDesc}
                      onChange={e => setNewDesc(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none"
                    />
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="RM"
                        value={newAmount}
                        onChange={e => setNewAmount(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none"
                      />
                      <button
                        onClick={handleAddPreset}
                        disabled={addingPreset || !newDesc.trim() || !newAmount}
                        className="px-4 py-2 rounded-xl text-white text-sm font-semibold transition disabled:opacity-50 active:scale-95 flex items-center gap-1.5"
                        style={{ backgroundColor: '#1B4332' }}
                      >
                        <Plus size={14} />
                        {addingPreset ? '...' : 'Tambah'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Summary across all years */}
                <div className="mt-6 pt-5 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Ringkasan Semua Tahun</p>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {YEAR_LEVELS.map(yr => {
                      const count = presets.filter(p => p.year_level === yr && p.is_active).length
                      const total = presets.filter(p => p.year_level === yr && p.is_active).reduce((s, p) => s + p.default_amount, 0)
                      return (
                        <button
                          key={yr}
                          onClick={() => setActiveYear(yr)}
                          className={`p-3 rounded-xl border text-center transition ${activeYear === yr ? 'border-green-700 bg-green-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}
                        >
                          <p className={`text-xs font-bold ${activeYear === yr ? 'text-green-800' : 'text-gray-500'}`}>Tahun {yr}</p>
                          <p className="text-sm font-bold text-gray-900 mt-1">RM {total.toFixed(0)}</p>
                          <p className="text-xs text-gray-400">{count} item</p>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Bank */}
          {tab === 'bank' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:p-8">
              <h3 className="text-base font-bold text-gray-900 mb-2">Kaedah Bayaran</h3>
              <p className="text-sm text-gray-500 mb-6">Maklumat akaun bank untuk paparan ibu bapa semasa membuat bayaran manual.</p>
              <div className="space-y-6 max-w-2xl">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nama Bank</label>
                  <input type="text" value={bankName} onChange={e => setBankName(e.target.value)}
                    placeholder="Contoh: Maybank"
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-[#0B4233] transition" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">No. Akaun</label>
                  <input type="text" value={bankAccountNo} onChange={e => setBankAccountNo(e.target.value)}
                    placeholder="Contoh: 5621 2345 6789"
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-[#0B4233] transition font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nama Pemilik Akaun</label>
                  <input type="text" value={bankAccountName} onChange={e => setBankAccountName(e.target.value)}
                    placeholder="Contoh: Sekolah Rendah Islam SRITI"
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-[#0B4233] transition" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nota Rujukan (Pilihan)</label>
                  <input type="text" value={bankReferenceNote} onChange={e => setBankReferenceNote(e.target.value)}
                    placeholder="Contoh: Sila masukkan No. Pelajar sebagai rujukan"
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-[#0B4233] transition" />
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
