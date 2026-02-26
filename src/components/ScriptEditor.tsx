// @ts-nocheck
import { useState } from 'react';
import { Button } from 'react-bootstrap';
import { ArrowLeft, Plus, Trash } from 'react-bootstrap-icons';
import { Pencil as Edit } from 'react-bootstrap-icons';

export default function ScriptEditor({ script, onBack, onUpdate, className }: ScriptEditorProps) {
  const [editingName, setEditingName] = useState(false)
  const [scriptName, setScriptName] = useState(script.name)

  const handleNameUpdate = () => {
    onUpdate({ ...script, name: scriptName })
    setEditingName(false)
  }

  return (
    <div className={`${className} d-flex flex-column`}>
      <div className="p-4 border-b flex items-center gap-2">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded"
        >
          <ArrowLeft size={20} />
        </button>
        
        {editingName ? (
          <form onSubmit={handleNameUpdate} className="flex-1">
            <input
              value={scriptName}
              onChange={(e) => setScriptName(e.target.value)}
              className="text-xl font-medium px-2 py-1 border rounded"
              autoFocus
            />
          </form>
        ) : (
          <h2 
            onClick={() => setEditingName(true)}
            className="text-xl font-medium cursor-text"
          >
            {script.name}
          </h2>
        )}
      </div>

      <div className="flex-grow-1 overflow-auto p-3">
        {script.steps.map(step => (
          <div key={step.id} className="p-4 border rounded-lg bg-gray-50">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium">
                  {step.type === 'sound' ? 'Звук' : 'Журнал'}
                </h3>
                <p className="text-sm text-gray-600">
                  {step.type === 'sound' ? step.file : step.message}
                </p>
                {step.duration && (
                  <span className="text-xs text-gray-500">{step.duration}</span>
                )}
              </div>
              <div className="flex gap-2">
                <button className="icon-btn">
                  <Edit size={16} />
                </button>
                <button className="icon-btn">
                  <Trash size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="border-top bg-light p-3 d-flex justify-content-center">
        <Button 
          variant="outline-primary" 
          className="rounded-circle p-2"
          style={{ width: '50px', height: '50px' }}
        >
          <Plus size={30} />
        </Button>
      </div>
    </div>
  )
}