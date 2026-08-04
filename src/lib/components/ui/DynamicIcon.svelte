<script lang="ts">
  import { 
    Folder, Code, Briefcase, Layers, Rocket, Star, Heart, Zap, Box, Compass, Laptop, Database, Globe, Hash,
    KanbanSquare, LayoutTemplate, ListTodo, CheckSquare, Calendar, Inbox
  } from "lucide-svelte";
  
  let { name = "Folder", class: className = "" } = $props<{ name?: string, class?: string }>();

  const iconMap: Record<string, any> = {
    Folder, Code, Briefcase, Layers, Rocket, Star, Heart, Zap, Box, Compass, Laptop, Database, Globe, Hash,
    KanbanSquare, LayoutTemplate, ListTodo, CheckSquare, Calendar, Inbox
  };

  let Component = $derived(iconMap[name] || Folder);
</script>

<Component class={className} />
