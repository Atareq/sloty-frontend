import {
  getApiErrorMessage,
  getApiFieldErrors,
  getFirstFieldErrorMessage,
  isApiClientError,
} from '../../core/api/apiError.helpers'

const messageMappings = [
  {
    patterns: ['username', 'already'],
    message: 'اسم المستخدم مستخدم بالفعل',
  },
  {
    patterns: ['email', 'already'],
    message: 'البريد الإلكتروني مستخدم بالفعل',
  },
  {
    patterns: ['already', 'club'],
    message: 'هذا المستخدم مرتبط بالفعل بالنادي',
  },
  {
    patterns: ['court', 'required'],
    message: 'يجب اختيار ملعب للموظف',
  },
  {
    patterns: ['court', 'club'],
    message: 'الملعب المحدد لا يتبع النادي',
  },
  {
    patterns: ['platform', 'admin', 'club'],
    message: 'لا يمكن ربط مسؤول منصة كعضو في نادي',
  },
  {
    patterns: ['manager', 'already'],
    message: 'المدير مرتبط بالفعل بنادٍ آخر',
  },
  {
    patterns: ['staff', 'already'],
    message: 'الموظف لديه بالفعل تكليف نشط',
  },
  {
    patterns: ['permission'],
    message: 'ليس لديك صلاحية تنفيذ هذا الإجراء',
  },
] as const

function mapKnownAdminMessage(message: string): string {
  const normalizedMessage = message.toLowerCase()
  const matchedMapping = messageMappings.find((mapping) =>
    mapping.patterns.every((pattern) => normalizedMessage.includes(pattern)),
  )

  return matchedMapping?.message ?? message
}

export function getAdminUserErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (isApiClientError(error) && error.status === 403) {
    return 'ليس لديك صلاحية تنفيذ هذا الإجراء'
  }

  return mapKnownAdminMessage(getApiErrorMessage(error, fallback))
}

export function getAdminUserFieldErrors<FieldName extends string>(
  error: unknown,
): Partial<Record<FieldName, string>> {
  const fieldErrors = getApiFieldErrors(error)
  const mappedErrors: Partial<Record<FieldName, string>> = {}

  if (!fieldErrors) {
    return mappedErrors
  }

  for (const fieldName of Object.keys(fieldErrors)) {
    const message = getFirstFieldErrorMessage(fieldErrors, fieldName)

    if (!message) {
      continue
    }

    mappedErrors[fieldName as FieldName] = mapKnownAdminMessage(message)
  }

  return mappedErrors
}
