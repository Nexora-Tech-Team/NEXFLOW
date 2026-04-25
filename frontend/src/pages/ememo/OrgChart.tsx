import { useState, useEffect, useContext } from 'react'
import { ouApi } from '../../api/ou'
import { usersApi } from '../../api/users'
import { NotifContext } from '../../context/NotifContext'
import { usePermission } from '../../hooks/usePermission'
import PermissionGate from '../../components/PermissionGate'

interface OUUnit {
  id: string; name: string; order: number
  parent_id: string | null; assigned_user_id: string | null
  assigned_user?: { id: string; fullname: string; username: string }
  children?: OUUnit[]
}

interface UserOption { id: string; fullname: string; username: string }

function OUNode({ unit, depth, onEdit, onDelete, onAdd, canEdit }: {
  unit: OUUnit; depth: number
  onEdit: (u: OUUnit) => void
  onDelete: (id: string) => void
  onAdd: (parentId: string) => void
  canEdit: boolean
}) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = unit.children && unit.children.length > 0

  return (
    <div className="relative">
      <div className={`flex items-center gap-3 ${depth > 0 ? 'ml-8' : ''}`}>
        {depth > 0 && <div className="absolute left-4 top-0 w-px h-full bg-gray-200 -z-10" style={{ top: '-20px', height: 'calc(100% + 20px)' }}></div>}
        {depth > 0 && <div className="w-4 h-px bg-gray-300 absolute" style={{ left: `${(depth - 1) * 32 + 16}px`, top: '24px' }}></div>}

        <div className={`card p-4 mb-2 flex-1 border-l-4 ${depth === 0 ? 'border-primary' : depth === 1 ? 'border-accent' : 'border-gray-300'}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {hasChildren && (
                <button onClick={() => setExpanded(e => !e)}
                  className="w-5 h-5 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                  {expanded ? '▼' : '▶'}
                </button>
              )}
              <div>
                <p className="font-semibold text-gray-800 text-sm">{unit.name}</p>
                {unit.assigned_user && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center text-white text-xs">
                      {unit.assigned_user.fullname.charAt(0)}
                    </div>
                    <span className="text-xs text-gray-500">{unit.assigned_user.fullname}</span>
                  </div>
                )}
              </div>
            </div>
            {canEdit && (
              <div className="flex items-center gap-1">
                <button onClick={() => onAdd(unit.id)}
                  className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary-50 rounded transition-colors" title="Tambah sub-unit">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <button onClick={() => onEdit(unit)}
                  className="p-1.5 text-gray-400 hover:text-accent hover:bg-blue-50 rounded transition-colors" title="Edit">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button onClick={() => onDelete(unit.id)}
                  className="p-1.5 text-gray-400 hover:text-danger hover:bg-red-50 rounded transition-colors" title="Hapus">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {expanded && hasChildren && (
        <div className="ml-8 pl-4 border-l-2 border-gray-200">
          {unit.children!.map(child => (
            <OUNode key={child.id} unit={child} depth={depth + 1}
              onEdit={onEdit} onDelete={onDelete} onAdd={onAdd} canEdit={canEdit} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function OrgChart() {
  const [tree, setTree] = useState<OUUnit[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editUnit, setEditUnit] = useState<OUUnit | null>(null)
  const [parentId, setParentId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', assigned_user_id: '', order: 0 })
  const { showNotif } = useContext(NotifContext)
  const ememoPerm = usePermission('ememo')

  useEffect(() => {
    Promise.all([ouApi.getTree(), usersApi.list()])
      .then(([treeRes, usersRes]) => {
        setTree(treeRes.data.data)
        setUsers(usersRes.data.data)
      }).catch(() => showNotif('error', 'Gagal memuat data'))
      .finally(() => setIsLoading(false))
  }, [])

  const refresh = async () => {
    const res = await ouApi.getTree()
    setTree(res.data.data)
  }

  const findUnitName = (units: OUUnit[], id: string): string => {
    for (const u of units) {
      if (u.id === id) return u.name
      if (u.children) {
        const found = findUnitName(u.children, id)
        if (found) return found
      }
    }
    return ''
  }

  const openCreate = (pId: string | null = null) => {
    setEditUnit(null)
    setParentId(pId)
    const parentName = pId ? findUnitName(tree, pId) : ''
    setForm({ name: parentName, assigned_user_id: '', order: 0 })
    setShowModal(true)
  }

  const openEdit = (unit: OUUnit) => {
    setEditUnit(unit)
    setParentId(unit.parent_id)
    setForm({ name: unit.name, assigned_user_id: unit.assigned_user_id || '', order: unit.order })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus unit ini?')) return
    try {
      await ouApi.delete(id)
      showNotif('success', 'Unit berhasil dihapus')
      refresh()
    } catch { showNotif('error', 'Gagal menghapus unit') }
  }

  const handleSave = async () => {
    if (!form.name) { showNotif('warning', 'Nama unit wajib diisi'); return }
    try {
      const payload = {
        name: form.name,
        parent_id: parentId || null,
        assigned_user_id: form.assigned_user_id || null,
        order: form.order,
      }
      if (editUnit) {
        await ouApi.update(editUnit.id, payload)
        showNotif('success', 'Unit berhasil diupdate')
      } else {
        await ouApi.create(payload)
        showNotif('success', 'Unit berhasil dibuat')
      }
      setShowModal(false)
      refresh()
    } catch { showNotif('error', 'Gagal menyimpan unit') }
  }

  return (
    <div className="overflow-y-auto h-full p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Bagan Organisasi</h2>
            <p className="text-gray-500 text-sm"></p>
          </div>
          <PermissionGate moduleName="ememo" requiredLevel="edit">
            <button onClick={() => openCreate(null)} className="btn-primary flex items-center gap-2 text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Tambah Unit
            </button>
          </PermissionGate>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : tree.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-5xl mb-3">🏢</div>
            <p>Belum ada struktur organisasi</p>
            <PermissionGate moduleName="ememo" requiredLevel="edit">
              <button onClick={() => openCreate(null)} className="btn-primary mt-4 text-sm">Buat Unit Pertama</button>
            </PermissionGate>
          </div>
        ) : (
          <div className="space-y-2">
            {tree.map(unit => (
              <OUNode key={unit.id} unit={unit} depth={0}
                onEdit={openEdit} onDelete={handleDelete} onAdd={openCreate}
                canEdit={ememoPerm.canEdit} />
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-fadeIn">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-800">{editUnit ? 'Edit Unit' : 'Tambah Unit'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="label">Nama Unit *</label>
                <input className="input-field" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Direktur Utama, Manager..." />
              </div>
              <div>
                <label className="label">User yang Ditugaskan</label>
                <select className="input-field" value={form.assigned_user_id} onChange={e => setForm(f => ({...f, assigned_user_id: e.target.value}))}>
                  <option value="">— Tidak ada —</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.fullname} ({u.username})</option>)}
                </select>
              </div>
              <div>
                <label className="label">Urutan</label>
                <input type="number" className="input-field" value={form.order} onChange={e => setForm(f => ({...f, order: Number(e.target.value)}))} min={0} />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Batal</button>
              <button onClick={handleSave} className="btn-primary">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
