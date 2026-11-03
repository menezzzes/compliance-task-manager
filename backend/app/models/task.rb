class Task < ApplicationRecord
  has_many :task_events, dependent: :destroy

  enum :status, { pending: "pending", completed: "completed" }, default: "pending", validate: true
  enum :priority, { low: "low", medium: "medium", high: "high" }, default: "medium", validate: true
  enum :category, {
    cra: "cra",
    hmda: "hmda",
    fair_lending: "fair_lending",
    section_1071: "section_1071",
    complaints: "complaints",
    marketing_compliance: "marketing_compliance",
    other: "other"
  }, default: "other", validate: true

  validates :title, presence: true, length: { maximum: 120 }

  after_create :record_created_event
  after_update :record_updated_event, if: :saved_changes?

  private

  def record_created_event
    task_events.create!(
      event_type: "created",
      metadata: slice(:title, :category, :priority, :status, :due_date)
    )
  end

  def record_updated_event
    event_type = saved_change_to_status? && completed? ? "completed" : "updated"
    task_events.create!(event_type: event_type, metadata: saved_changes.except("updated_at"))
  end
end
