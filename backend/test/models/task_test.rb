require "test_helper"

class TaskTest < ActiveSupport::TestCase
  # Validations

  test "is valid with only a title" do
    assert Task.new(title: "File HMDA LAR").valid?
  end

  test "requires a title" do
    task = Task.new(title: "")

    assert_not task.valid?
    assert_includes task.errors[:title], "can't be blank"
  end

  test "accepts a title with 120 characters" do
    assert Task.new(title: "a" * 120).valid?
  end

  test "rejects a title with more than 120 characters" do
    task = Task.new(title: "a" * 121)

    assert_not task.valid?
    assert_includes task.errors[:title], "is too long (maximum is 120 characters)"
  end

  test "uses default status, priority and category" do
    task = Task.new

    assert_equal "pending", task.status
    assert_equal "medium", task.priority
    assert_equal "other", task.category
  end

  test "rejects an invalid status" do
    task = Task.new(title: "File HMDA LAR", status: "archived")

    assert_not task.valid?
    assert_includes task.errors[:status], "is not included in the list"
  end

  test "rejects an invalid priority" do
    task = Task.new(title: "File HMDA LAR", priority: "urgent")

    assert_not task.valid?
    assert_includes task.errors[:priority], "is not included in the list"
  end

  test "rejects an invalid category" do
    task = Task.new(title: "File HMDA LAR", category: "taxes")

    assert_not task.valid?
    assert_includes task.errors[:category], "is not included in the list"
  end

  # Associations

  test "destroying a task destroys its events" do
    task = tasks(:fair_lending_policy)

    assert_difference "TaskEvent.count", -2 do
      task.destroy!
    end
    assert_not TaskEvent.exists?(task_id: task.id)
  end

  # Callbacks

  test "creating a task records a created event with the initial values" do
    task = Task.create!(title: "File HMDA LAR", category: "hmda", priority: "high", due_date: "2027-03-01")

    event = task.reload.task_events.sole

    assert_equal "created", event.event_type
    assert_equal(
      {
        "title" => "File HMDA LAR",
        "category" => "hmda",
        "priority" => "high",
        "status" => "pending",
        "due_date" => "2027-03-01"
      },
      event.metadata
    )
  end

  test "updating the title records an updated event with the changes" do
    task = tasks(:cra_exam_prep)
    old_title = task.title

    assert_difference "task.task_events.count", 1 do
      task.update!(title: "New title")
    end

    event = TaskEvent.where(task: task).order(:created_at).last

    assert_equal "updated", event.event_type
    assert_equal({ "title" => [ old_title, "New title" ] }, event.metadata)
  end

  test "changing the status to completed records a completed event" do
    task = tasks(:cra_exam_prep)

    assert_difference "task.task_events.count", 1 do
      task.update!(status: "completed")
    end

    event = TaskEvent.where(task: task).order(:created_at).last

    assert_equal "completed", event.event_type
    assert_equal({ "status" => [ "pending", "completed" ] }, event.metadata)
  end

  test "reopening a task records an updated event" do
    task = tasks(:fair_lending_policy)

    assert_difference "task.task_events.count", 1 do
      task.update!(status: "pending")
    end

    event = TaskEvent.where(task: task).order(:created_at).last

    assert_equal "updated", event.event_type
    assert_equal({ "status" => [ "completed", "pending" ] }, event.metadata)
  end

  test "saving without changes does not record an event" do
    task = tasks(:cra_exam_prep)

    assert_no_difference "TaskEvent.count" do
      task.save!
      task.update!(title: task.title)
    end
  end
end
