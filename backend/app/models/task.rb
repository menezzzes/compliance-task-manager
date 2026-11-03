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
end