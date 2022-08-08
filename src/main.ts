import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import Cookies from 'js-cookie'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import App from './App.vue'
import './style/main.css'
import 'element-plus/dist/index.css'
import router from './router'
import { messages } from './utils/localeMessages'

const app = createApp(App)
app.use(ElementPlus)
app.use(createPinia())
// Make sure to _use_ the router instance to make the whole app router-aware.
app.use(router)
app.use(createI18n({
  locale: Cookies.get('lang') || 'zh',
  fallbackLocale: 'en',
  messages
}))
// app.config.productionTip = false
// app.config.devtools = false

app.mount('#app')
