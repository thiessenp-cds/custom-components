import './IssueTable.css'

interface Ticket {
  text: string
  href: string
}

export interface Issue {
  combo: string
  description: string
  tickets?: Ticket[]
}

interface IssueTableProps {
  issues?: Issue[]
}

export default function IssueTable({ issues = [] }: IssueTableProps) {
  if (issues.length === 0) return null

  return (
    <div className="issue-table-wrapper">
      <h2 className="issue-table__heading">Known issues</h2>
      <table className="issue-table">
        <thead>
          <tr>
            <th scope="col">Browser + AT</th>
            <th scope="col">Description</th>
            <th scope="col">Tickets</th>
          </tr>
        </thead>
        <tbody>
          {issues.map((issue, i) => (
            <tr key={i}>
              <td>{issue.combo}</td>
              <td>{issue.description}</td>
              <td>
                {issue.tickets?.map((t, j) => (
                  <span key={j}>
                    {j > 0 && ' '}
                    <a href={t.href} target="_blank" rel="noreferrer">{t.text}</a>
                  </span>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
