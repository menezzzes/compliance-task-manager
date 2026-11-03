class CreateTaskEvents < ActiveRecord::Migration[8.1]
  def change
    create_table :task_events do |t|
      t.references :task, null: false, foreign_key: true
      t.string :event_type
      t.jsonb :metadata

      t.timestamps
    end
  end
end
