export function Footer() {
  return (
    <footer className="border-t bg-white mt-auto">
      <div className="container mx-auto px-4 py-4">
        <p className="text-center text-sm text-gray-600">
          © Rail Europe {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  )
}
