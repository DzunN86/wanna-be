/** @jsx jsx **/
import { jsx } from '@emotion/react'

const NotFound = () => {
  return (
    <div className="flex h-screen">
      <div className="flex items-center justify-center flex-1 text-lg">
        <div>
          {/* <div className={`flex flex-shrink-0 mr-6`}>
            <Link href={'/'} className="text-xl font-semibold text-indigo-500">
              <img src={'/imgs/logo.svg'} width="175px" alt="Pelindo III" />
            </Link>
          </div> */}
          <div className="text-2xl font-bold">Mohon Maaf</div>
          <div className="text-lg">Halaman yang anda tuju tidak ditemukan</div>
          <div className="text-sm">
            <a className="underline" href="/">
              Klik disini
            </a>{' '}
            untuk kembali ke home
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotFound
