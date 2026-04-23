import Link from 'next/link'
import BrandWordmark from './BrandWordmark'

const footerLinks = [
  { href: '/', label: 'Home' },
  { href: '/components', label: 'Components' },
  { href: '/pipeline', label: 'Pipeline' },
  { href: '/dashboard', label: 'Dashboard' },
]

export default function Footer() {
  return (
    <footer className="border-t border-[--border-default] bg-[--bg-base] px-6 py-10 transition-colors duration-300 lg:px-10">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <BrandWordmark withTagline />
          <p className="mt-4 max-w-md text-base leading-7 text-[--text-secondary]">
            © 2026 Velox UI. Built for developers who care about motion.
          </p>
        </div>

        <nav aria-label="Footer navigation" className="flex flex-wrap gap-5 text-sm font-medium text-[--text-secondary]">
          {footerLinks.map((link) => (
            <Link
              key={link.href + link.label}
              href={link.href}
              className="transition hover:text-[--text-primary]"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
