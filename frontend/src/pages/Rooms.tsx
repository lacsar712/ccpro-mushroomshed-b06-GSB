import { createSignal, onMount } from 'solid-js'
import { For, Show } from 'solid-js'
import { api } from '../api/client'
import type { ColorNote, Room, RoomStatus, Shade, Shed } from '../types'

const statuses: RoomStatus[] = ['fruiting', 'idle', 'sanitize']
const shades: Shade[] = ['pale', 'mottled', 'dark']

const shadeLabels: Record<Shade, string> = {
  pale: 'pale 偏白',
  mottled: 'mottled 花斑',
  dark: 'dark 深褐',
}

function toLocalInput(iso?: string) {
  const d = iso ? new Date(iso) : new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const empty = {
  shedId: '',
  roomCode: '',
  species: '',
  capacityBags: '',
  status: 'fruiting' as RoomStatus,
}

const emptyNote = {
  roomId: '',
  shade: 'pale' as Shade,
  ratioPct: '',
  notedAt: toLocalInput(),
  observer: '',
}

export default function Rooms() {
  const [rows, setRows] = createSignal<Room[]>([])
  const [sheds, setSheds] = createSignal<Shed[]>([])
  const [form, setForm] = createSignal({ ...empty })
  const [noteForm, setNoteForm] = createSignal({ ...emptyNote })
  const [notes, setNotes] = createSignal<ColorNote[]>([])
  const [error, setError] = createSignal('')

  async function load() {
    const [rooms, shedList] = await Promise.all([
      api<Room[]>('/api/rooms'),
      api<Shed[]>('/api/sheds'),
    ])
    setRows(rooms)
    setSheds(shedList)
  }

  async function loadNotes(roomId: string) {
    if (!roomId) {
      setNotes([])
      return
    }
    const list = await api<ColorNote[]>(`/api/color-notes?roomId=${roomId}`)
    setNotes(list)
  }

  onMount(() => {
    load().catch((e) => setError(e.message))
  })

  async function onSubmit(e: Event) {
    e.preventDefault()
    setError('')
    try {
      await api('/api/rooms', {
        method: 'POST',
        body: JSON.stringify({
          shedId: Number(form().shedId),
          roomCode: form().roomCode,
          species: form().species,
          capacityBags: Number(form().capacityBags),
          status: form().status,
        }),
      })
      setForm({ ...empty })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    }
  }

  async function onSubmitNote(e: Event) {
    e.preventDefault()
    setError('')
    try {
      await api('/api/color-notes', {
        method: 'POST',
        body: JSON.stringify({
          roomId: Number(noteForm().roomId),
          shade: noteForm().shade,
          ratioPct: Number(noteForm().ratioPct),
          notedAt: new Date(noteForm().notedAt).toISOString(),
          observer: noteForm().observer,
        }),
      })
      const roomId = noteForm().roomId
      setNoteForm({ ...emptyNote, roomId, notedAt: toLocalInput() })
      await Promise.all([load(), loadNotes(roomId)])
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    }
  }

  async function remove(id: number) {
    if (!confirm('确认删除该出菇室？')) return
    try {
      await api(`/api/rooms/${id}`, { method: 'DELETE' })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败')
    }
  }

  function statusBadge(status: RoomStatus) {
    return `badge ${status}`
  }

  return (
    <div>
      <header class="page-header">
        <h1>出菇室</h1>
        <p class="muted">菌种、袋数容量与房态；色斑停采判定见下表</p>
      </header>
      {error() && <div class="error">{error()}</div>}

      <form class="panel form-grid" onSubmit={onSubmit}>
        <label>
          所属菇房
          <select
            value={form().shedId}
            onChange={(e) => setForm({ ...form(), shedId: e.currentTarget.value })}
            required
          >
            <option value="">选择菇房</option>
            <For each={sheds()}>
              {(s) => <option value={String(s.id)}>{s.name}</option>}
            </For>
          </select>
        </label>
        <label>
          室编号
          <input
            value={form().roomCode}
            onInput={(e) => setForm({ ...form(), roomCode: e.currentTarget.value })}
            required
          />
        </label>
        <label>
          品种
          <input
            value={form().species}
            onInput={(e) => setForm({ ...form(), species: e.currentTarget.value })}
            required
          />
        </label>
        <label>
          容量 (袋)
          <input
            type="number"
            min="1"
            value={form().capacityBags}
            onInput={(e) => setForm({ ...form(), capacityBags: e.currentTarget.value })}
            required
          />
        </label>
        <label>
          状态
          <select
            value={form().status}
            onChange={(e) =>
              setForm({ ...form(), status: e.currentTarget.value as RoomStatus })
            }
          >
            <For each={statuses}>{(s) => <option value={s}>{s}</option>}</For>
          </select>
        </label>
        <button type="submit" class="btn primary">
          新增出菇室
        </button>
      </form>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>菇房 ID</th>
              <th>编号</th>
              <th>品种</th>
              <th>容量</th>
              <th>状态</th>
              <th>最新色斑</th>
              <th>采收</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <For each={rows()}>
              {(r) => (
                <tr>
                  <td>{r.id}</td>
                  <td>{r.shedId}</td>
                  <td>{r.roomCode}</td>
                  <td>{r.species}</td>
                  <td>{r.capacityBags}</td>
                  <td>
                    <span class={statusBadge(r.status)}>{r.status}</span>
                  </td>
                  <td>
                    {r.latestShade ? (
                      <span class={`badge shade-${r.latestShade}`}>{r.latestShade}</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    {r.holdHarvest ? <span class="badge hold">停采中</span> : '—'}
                  </td>
                  <td>
                    <button type="button" class="btn ghost" onClick={() => remove(r.id)}>
                      删除
                    </button>
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>

      <section class="panel">
        <h2>菌盖色斑备忘</h2>
        <p class="muted">
          最新一条 dark 且比例 &gt; 40% 时该室停采；登记更晚的 pale 后解除
        </p>
        <form class="form-grid" onSubmit={onSubmitNote}>
          <label>
            出菇室
            <select
              value={noteForm().roomId}
              onChange={(e) => {
                const roomId = e.currentTarget.value
                setNoteForm({ ...noteForm(), roomId })
                loadNotes(roomId).catch((err) =>
                  setError(err instanceof Error ? err.message : '加载失败')
                )
              }}
              required
            >
              <option value="">选择出菇室</option>
              <For each={rows()}>
                {(r) => (
                  <option value={String(r.id)}>
                    {r.roomCode} · {r.species}
                  </option>
                )}
              </For>
            </select>
          </label>
          <label>
            色斑
            <select
              value={noteForm().shade}
              onChange={(e) => setNoteForm({ ...noteForm(), shade: e.currentTarget.value as Shade })}
            >
              <For each={shades}>{(s) => <option value={s}>{shadeLabels[s]}</option>}</For>
            </select>
          </label>
          <label>
            比例 (%)
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={noteForm().ratioPct}
              onInput={(e) => setNoteForm({ ...noteForm(), ratioPct: e.currentTarget.value })}
              required
            />
          </label>
          <label>
            观察时间
            <input
              type="datetime-local"
              value={noteForm().notedAt}
              onInput={(e) => setNoteForm({ ...noteForm(), notedAt: e.currentTarget.value })}
              required
            />
          </label>
          <label>
            观察人
            <input
              value={noteForm().observer}
              onInput={(e) => setNoteForm({ ...noteForm(), observer: e.currentTarget.value })}
              required
            />
          </label>
          <button type="submit" class="btn primary">
            追加备忘
          </button>
        </form>

        <Show when={noteForm().roomId}>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>时间</th>
                  <th>色斑</th>
                  <th>比例</th>
                  <th>观察人</th>
                </tr>
              </thead>
              <tbody>
                <For each={notes()}>
                  {(n) => (
                    <tr>
                      <td>{n.id}</td>
                      <td>{new Date(n.notedAt).toLocaleString()}</td>
                      <td>
                        <span class={`badge shade-${n.shade}`}>{n.shade}</span>
                      </td>
                      <td>{n.ratioPct}%</td>
                      <td>{n.observer}</td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </Show>
      </section>
    </div>
  )
}
