import { RouterProvider } from 'react-router-dom'
import { RecoilRoot } from 'recoil'
import { ToastContainer } from 'react-toastify'
import { router } from './routes'

import 'react-toastify/dist/ReactToastify.css'
import '@/styles/global.scss'

function App() {
  return (
    <RecoilRoot>
      <RouterProvider router={router} />
      <ToastContainer
        position="top-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </RecoilRoot>
  )
}

export default App
