import { useParams } from 'react-router-dom'
import PlaceholderPage from '../components/ui/PlaceholderPage.jsx'

export default function ProductDetail() {
  const { slug } = useParams()

  return (
    <PlaceholderPage
      title="Product Detail"
      description={`Details for "${slug}" will be available once product data fetching is implemented.`}
    />
  )
}
