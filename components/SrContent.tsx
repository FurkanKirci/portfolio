import { about, channels, cores, contact, hops, procs, profile } from '@/lib/content'

/**
 * Sitenin tamamı, düz ve anlamlı HTML olarak. Görsel olarak gizli; ekran okuyucular ve
 * arama motorları içeriğe 3B sahneden bağımsız, tek seferde ulaşır.
 */
export function SrContent() {
  const featured = procs.filter((p) => p.featured)
  const others = procs.filter((p) => !p.featured && p.pid !== 1 && p.stack.length)
  return (
    <div className="sr-only">
      <h1>
        {profile.name} — {profile.role}, {profile.city}
      </h1>
      <p>{about.lede}</p>
      <p>{about.sub}</p>
      <ul>
        {about.selfTest.map((r) => (
          <li key={r.k}>
            {r.k}: {r.v}
          </li>
        ))}
      </ul>

      <h2>Yetenekler</h2>
      {cores.map((c) => (
        <section key={c.key}>
          <h3>{c.label}</h3>
          <p>{c.modules.join(', ')}</p>
          {c.notes && <p>{c.notes.join('. ')}</p>}
        </section>
      ))}

      <h2>Projeler</h2>
      {featured.map((p) => (
        <article key={p.pid}>
          <h3>
            {p.title} ({p.org})
          </h3>
          <p>{p.cmd}</p>
          {p.insight && <p>{p.insight}</p>}
          {p.sections?.map((s) => (
            <section key={s.h}>
              <h4>{s.h}</h4>
              <ul>
                {s.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </section>
          ))}
          <p>Teknolojiler: {p.stack.join(', ')}</p>
          {p.links?.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </article>
      ))}
      <ul>
        {others.map((p) => (
          <li key={p.pid}>
            {p.title}: {p.cmd} ({p.stack.join(', ')})
          </li>
        ))}
      </ul>

      <h2>Deneyim ve eğitim</h2>
      <ul>
        {channels.map((c) => (
          <li key={c.id}>
            {c.role} — {c.org}, {c.place} ({c.range}). {c.lines.join('. ')}
          </li>
        ))}
      </ul>

      <h2>Yolculuk</h2>
      <ol>
        {hops.map((h) => (
          <li key={h.n}>
            {h.city} {h.year}: {h.note}
          </li>
        ))}
      </ol>

      <h2>İletişim</h2>
      <p>
        E-posta: <a href={`mailto:${profile.email}`}>{profile.email}</a>
      </p>
      <p>
        <a href={profile.github.url}>GitHub</a> · <a href={profile.linkedin.url}>LinkedIn</a>
      </p>
      <p>{contact.note}</p>
    </div>
  )
}
