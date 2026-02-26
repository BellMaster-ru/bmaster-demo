// @ts-nocheck
import { useState, useMemo } from 'react';
import { Table, Button, Form, Badge } from 'react-bootstrap';
import { Plus} from 'react-bootstrap-icons';
import { Script, ScriptListProps } from '../types/scriptTypes';


export default function ScriptList({ scripts, onSelect, className }: ScriptListProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Сбор уникальных категорий
  const categories = useMemo(() => {
    const allTags = scripts.flatMap(s => s.tags);
    return Array.from(new Set(allTags));
  }, [scripts]);

  const filteredScripts = useMemo(() => {
    if (selectedCategory === 'all') return scripts;
    return scripts.filter(s => s.tags.includes(selectedCategory));
  }, [scripts, selectedCategory]);

  const handleRowClick = (e: React.MouseEvent, script: Script) => {
    const target = e.target as HTMLElement;
    
    // Предотвращаем переход при клике на кнопки
    if (!target.closest('button')) {
      onSelect(script);
    }
  };

  return (
    <div className={`${className} border-start d-flex flex-column`}>
      <div className="p-3 border-bottom">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">Сценарии</h5>
          <Button variant="primary" size="sm">
            <Plus size={16} />
          </Button>
        </div>

        <Form.Select 
          size="sm"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="all">Все категории</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </Form.Select>
      </div>

      <div className="flex-grow-1 overflow-auto">
        <Table hover className="mb-0">
          <thead className="sticky-top bg-light">
            <tr>
              <th className="w-20 ps-3">ID</th>
              <th className="w-30">Теги</th>
              <th className="w-40">Название</th>
              <th className="w-10">Время</th>
            </tr>
          </thead>
          <tbody>
            {filteredScripts.map((script) => (
              <tr 
                key={script.id}
                onClick={(e) => handleRowClick(e, script)}
                className="cursor-pointer"
              >
                <td className="ps-3">{script.id}</td>
                <td>
                  {script.tags.map(tag => (
                    <Badge key={tag} bg="secondary" className="me-1">
                      {tag}
                    </Badge>
                  ))}
                </td>
                <td className="text-truncate" style={{ maxWidth: '200px' }}>
                  {script.name}
                </td>
                <td>{script.schedule}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </div>
  );
}