import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

type AccessLevel = 'none' | 'view' | 'edit' | 'admin'

const levelOrder: Record<AccessLevel, number> = {
  none: 0,
  view: 1,
  edit: 2,
  admin: 3,
}

export function usePermission(moduleName: string) {
  const { permissions } = useContext(AuthContext)
  const perm = permissions.find(p => p.module_name === moduleName)
  const accessLevel: AccessLevel = (perm?.access_level as AccessLevel) || 'none'

  return {
    accessLevel,
    hasAccess: accessLevel !== 'none',
    canView: levelOrder[accessLevel] >= levelOrder['view'],
    canEdit: levelOrder[accessLevel] >= levelOrder['edit'],
    isAdmin: levelOrder[accessLevel] >= levelOrder['admin'],
    check: (required: AccessLevel) => levelOrder[accessLevel] >= levelOrder[required],
  }
}
