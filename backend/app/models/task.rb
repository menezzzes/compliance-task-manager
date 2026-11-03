class Task < ApplicationRecord
  SORTABLE_COLUMNS = %w[created_at due_date priority title].freeze
  SORT_DIRECTIONS = %w[asc desc].freeze
  PRIORITY_ORDER = %w[high medium low].freeze

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
  validate :due_date_must_be_a_date

  after_create :record_created_event
  after_update :record_updated_event, if: :saved_changes?

  scope :overdue, -> { pending.where(due_date: ...Date.current) }

  def self.sorted_by(column, direction)
    column = "created_at" unless SORTABLE_COLUMNS.include?(column)
    direction = "desc" unless SORT_DIRECTIONS.include?(direction)

    sorted =
      case column
      when "priority"
        in_order_of(:priority, direction == "desc" ? PRIORITY_ORDER : PRIORITY_ORDER.reverse)
      when "due_date"
        order(arel_table[:due_date].public_send(direction).nulls_last)
      when "title"
        order(arel_table[:title].lower.public_send(direction))
      else
        order(created_at: direction)
      end

    # Tasks with equal values need a fixed order, or pages could repeat or skip them.
    sorted.order(id: direction)
  end

  def overdue?
    pending? && due_date.present? && due_date < Date.current
  end

  def as_json(options = nil)
    super.merge("overdue" => overdue?)
  end

  private

  # Rails turns an unparseable date into nil, so the original value has to be checked.
  def due_date_must_be_a_date
    return if due_date_before_type_cast.to_s.blank? || due_date.is_a?(Date)

    errors.add(:due_date, "is not a valid date")
  end

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
