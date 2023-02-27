import { z } from 'zod'
import { t } from '@/i18n'

export const inputNameSchema = z.string()
  .min(1, { message: t('Please input name') })

export const usernameSchema = inputNameSchema
  .min(2, { message: t('NameLimitMsg') })
  .max(20, { message: t('Please use a shorter name') })

export const inputPasswordSchema = z.string()
  .min(1, { message: t('Please input the password') })
