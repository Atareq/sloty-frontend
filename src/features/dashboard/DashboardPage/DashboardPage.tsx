import { useNavigate } from 'react-router'
import { usePlaceholderAuth } from '../../../core/auth/usePlaceholderAuth'
import { AppButton } from '../../../shared/components/AppButton/AppButton'
import { AppCard } from '../../../shared/components/AppCard/AppCard'
import { PageHeader } from '../../../shared/components/PageHeader/PageHeader'
import { StatusChip } from '../../../shared/components/StatusChip/StatusChip'

/**
 * Dashboard placeholder for the foundation sprint.
 *
 * It deliberately avoids fake booking, payment, settlement, or club metrics.
 * Real numbers should come from agreed backend contracts in later work.
 */
export function DashboardPage() {
  const navigate = useNavigate()
  const { logout } = usePlaceholderAuth()

  function handleLogout(): void {
    logout()
    navigate('/login')
  }

  return (
    <div className="space-y-5">
      <PageHeader
        actions={
          <AppButton onClick={handleLogout} variant="secondary">
            تسجيل الخروج
          </AppButton>
        }
        description="هذه صفحة تأسيسية للواجهة فقط. سيتم توصيل البيانات الحقيقية بعد اعتماد واجهات الخلفية."
        title="لوحة التحكم"
      />

      <AppCard className="space-y-4">
        <StatusChip status="hold" />
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-[var(--sloty-text-primary)]">
            أساس واجهة سلوتي جاهز للبناء
          </h2>
          <p className="text-sm leading-6 text-[var(--sloty-text-muted)]">
            المسارات، الحماية التجريبية، المكونات المشتركة، وألوان الهوية
            الأساسية موجودة الآن بدون بيانات حجوزات أو مدفوعات وهمية.
          </p>
        </div>
      </AppCard>
    </div>
  )
}
