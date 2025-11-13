# CourseSidebar Component

A modern, accessible sidebar navigation component for course dashboards with smooth animations, dark mode support, and responsive design.

## Features

- 🎨 **Modern Design** - Gradient active states with glowing effects
- 📱 **Fully Responsive** - Collapsible sidebar, off-canvas on mobile
- 🌙 **Dark Mode** - Full support with adjusted shadows and colors
- ♿ **Accessible** - ARIA roles, keyboard navigation, focus states
- 🎯 **Badge Support** - Show unread/pending counts
- 💡 **Smart Tooltips** - Contextual help when sidebar is collapsed
- ⚡ **Smooth Animations** - Professional transitions using cubic-bezier easing

## Usage

```tsx
import CourseSidebar, { type TabItem } from './components/course/CourseSidebar'

const tabs: TabItem[] = [
  { 
    id: 'assignments',
    label: 'Assignments',
    icon: '📋',
    tooltip: 'View your assignments',
    badge: 5  // Optional: show count
  },
  {
    id: 'notes',
    label: 'Notes',
    icon: '📝',
    tooltip: 'Course notes and materials'
  }
]

function MyComponent() {
  const [activeTab, setActiveTab] = useState('assignments')

  return (
    <>
      <CourseSidebar 
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userRole="student"  // Optional: shows in footer
      />
      
      <div className="course-content">
        {/* Your main content */}
      </div>
    </>
  )
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `tabs` | `TabItem[]` | Yes | Array of tab configurations |
| `activeTab` | `string` | Yes | ID of currently active tab |
| `onTabChange` | `(tabId: string) => void` | Yes | Callback when tab is clicked |
| `userRole` | `string` | No | User role to display in footer badge |

## TabItem Type

```typescript
interface TabItem {
  id: string           // Unique identifier
  label: string        // Display text
  icon: string         // Emoji or icon character
  tooltip?: string     // Tooltip text (defaults to label)
  visible?: boolean    // Show/hide tab (default: true)
  badge?: number       // Badge count (0 = hidden)
}
```

## CSS Classes

Main classes for customization:

- `.course-sidebar` - Main container
- `.course-sidebar.collapsed` - Collapsed state
- `.nav-item` - Individual tab
- `.nav-item.active` - Active tab
- `.nav-badge` - Badge element
- `.nav-tooltip` - Tooltip popup

## Keyboard Navigation

- `Tab` - Navigate between tabs
- `Enter` or `Space` - Activate focused tab
- `←` Toggle button - Collapse/expand sidebar

## Responsive Breakpoints

- **Desktop (> 768px)**: Fixed left sidebar (280px expanded, 80px collapsed)
- **Mobile (≤ 768px)**: Off-canvas sidebar with toggle button

## Accessibility

✅ Proper ARIA roles (`navigation`, `menu`, `menuitem`)  
✅ `aria-current="page"` for active tab  
✅ `aria-expanded` for toggle button  
✅ Focus-visible states with outlines  
✅ Keyboard navigation support  
✅ Screen reader friendly labels

## Customization

### Change Sidebar Width

Edit `CourseSidebar.css`:

```css
.course-sidebar {
  width: 320px;  /* Change from 280px */
}

.course-sidebar.collapsed {
  width: 100px;  /* Change from 80px */
}
```

Don't forget to update the corresponding margin in `CourseDetails.css`:

```css
.course-details-page {
  margin-left: 320px;  /* Match sidebar width */
}
```

### Custom Active State Colors

```css
.nav-item.active {
  background: linear-gradient(135deg, #your-color-1, #your-color-2);
  box-shadow: 0 4px 12px rgba(your-color, 0.3);
}
```

### Change Animation Speed

```css
.course-sidebar {
  transition: width 0.5s ease;  /* Change from 0.3s */
}
```

## Examples

### With Dynamic Badges

```tsx
const tabs = useMemo(() => [
  { 
    id: 'inbox',
    label: 'Inbox',
    icon: '📨',
    badge: unreadCount,  // Dynamic count
    tooltip: `${unreadCount} unread messages`
  }
], [unreadCount])
```

### Role-Based Tabs

```tsx
const tabs = useMemo(() => {
  const studentTabs = [...]
  const teacherTabs = [...]
  
  return user?.role === 'teacher' ? teacherTabs : studentTabs
}, [user?.role])
```

### Conditional Visibility

```tsx
const tabs = [
  { id: 'videos', label: 'Videos', icon: '🎥', visible: hasVideoAccess },
  { id: 'admin', label: 'Admin', icon: '⚙️', visible: isAdmin }
]
```

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support  
- Safari: ✅ Full support
- Mobile browsers: ✅ Full support

## Performance

- Single `useMemo` for tab filtering
- No heavy computations
- CSS transitions (GPU accelerated)
- Minimal re-renders

## License

Part of the FYP-Project student portal.
