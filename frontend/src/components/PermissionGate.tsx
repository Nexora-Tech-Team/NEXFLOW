import { usePermission } from '../hooks/usePermission'

interface PermissionGateProps {
  moduleName: string
  requiredLevel: 'view' | 'edit' | 'admin'
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function PermissionGate({ moduleName, requiredLevel, children, fallback = null }: PermissionGateProps) {
  const perm = usePermission(moduleName)

  if (!perm.check(requiredLevel)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
