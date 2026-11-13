/** Layar tugas: tanpa navbar, dengan tombol kembali di tiap halaman (spec F11). */
export default function TaskLayout({ children }: { children: React.ReactNode }) {
  return <main style={{ padding: '20px 16px 16px', maxWidth: 720, margin: '0 auto' }}>{children}</main>;
}
