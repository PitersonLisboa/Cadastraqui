import { atom } from 'recoil'
import { recoilPersist } from 'recoil-persist'
import { Usuario } from '@/types'

const { persistAtom } = recoilPersist({
  key: 'cadastraqui-persist',
  storage: localStorage,
})

// Estado de autenticação
export const authState = atom<{
  token: string | null
  usuario: Usuario | null
  isAuthenticated: boolean
}>({
  key: 'authState',
  default: {
    token: null,
    usuario: null,
    isAuthenticated: false,
  },
  effects_UNSTABLE: [persistAtom],
})

// Estado de loading global
export const loadingState = atom<boolean>({
  key: 'loadingState',
  default: false,
})

// Estado do sidebar
export const sidebarState = atom<{
  isOpen: boolean
  isCollapsed: boolean
}>({
  key: 'sidebarState',
  default: {
    isOpen: true,
    isCollapsed: false,
  },
  effects_UNSTABLE: [persistAtom],
})

// Estado de tema (para futuro dark mode)
export const themeState = atom<'light' | 'dark'>({
  key: 'themeState',
  default: 'light',
  effects_UNSTABLE: [persistAtom],
})

// Estado da camada de sidebar: 'menu' (padrão) ou 'cadastro' (seções do formulário)
export const sidebarModeState = atom<{
  mode: 'menu' | 'cadastro'
  activeSection: string
}>({
  key: 'sidebarModeState',
  default: {
    mode: 'menu',
    activeSection: 'candidato',
  },
})
