require "test_helper"

module Api
  module V1
    class TasksControllerTest < ActionDispatch::IntegrationTest
      MISSING_ID = 0

      test "index without filters returns all tasks" do
        get api_v1_tasks_path

        assert_response :ok
        assert_equal Task.pluck(:id).sort, returned_ids
      end

      test "index filters by status" do
        get api_v1_tasks_path, params: { status: "completed" }

        assert_response :ok
        assert_returned_tasks :fair_lending_policy, :complaint_log_close_out
      end

      test "index filters by category" do
        get api_v1_tasks_path, params: { category: "hmda" }

        assert_response :ok
        assert_returned_tasks :hmda_lar_review
      end

      test "index filters by priority" do
        get api_v1_tasks_path, params: { priority: "high" }

        assert_response :ok
        assert_returned_tasks :cra_exam_prep, :hmda_lar_review
      end

      test "index searches the title ignoring case" do
        get api_v1_tasks_path, params: { q: "complaint LOG" }

        assert_response :ok
        assert_returned_tasks :complaint_log_close_out
      end

      test "index combines filters" do
        get api_v1_tasks_path, params: { priority: "high", category: "cra" }

        assert_response :ok
        assert_returned_tasks :cra_exam_prep
      end

      test "index ignores an invalid status" do
        get api_v1_tasks_path, params: { status: "archived" }

        assert_response :ok
        assert_equal Task.count, returned_ids.size
      end

      test "index ignores an invalid category" do
        get api_v1_tasks_path, params: { category: "taxes" }

        assert_response :ok
        assert_equal Task.count, returned_ids.size
      end

      test "index ignores an invalid priority" do
        get api_v1_tasks_path, params: { priority: "urgent" }

        assert_response :ok
        assert_equal Task.count, returned_ids.size
      end

      test "index treats % in the search as plain text" do
        get api_v1_tasks_path, params: { q: "%" }

        assert_response :ok
        assert_returned_tasks :hmda_lar_review
      end

      test "index treats _ in the search as plain text" do
        get api_v1_tasks_path, params: { q: "_" }

        assert_response :ok
        assert_returned_tasks :fair_lending_policy
      end

      test "index filters by overdue" do
        get api_v1_tasks_path, params: { overdue: "true" }

        assert_response :ok
        assert_returned_tasks :hmda_lar_review
      end

      test "index ignores other overdue values" do
        get api_v1_tasks_path, params: { overdue: "false" }

        assert_equal Task.count, returned_ids.size
      end

      test "index includes overdue in each task" do
        get api_v1_tasks_path, params: { per_page: 100 }

        overdue_by_id = response.parsed_body["data"].to_h { |task| [ task["id"], task["overdue"] ] }

        assert_equal true, overdue_by_id[tasks(:hmda_lar_review).id]
        assert_equal false, overdue_by_id[tasks(:fair_lending_policy).id]
        assert_equal false, overdue_by_id[tasks(:section_1071_data_audit).id]
      end

      test "index sorts by newest first by default" do
        tasks(:staff_training).update_column(:created_at, 1.day.from_now)
        tasks(:cra_exam_prep).update_column(:created_at, 1.year.ago)

        get api_v1_tasks_path

        assert_equal tasks(:staff_training).id, ordered_ids.first
        assert_equal tasks(:cra_exam_prep).id, ordered_ids.last
      end

      test "index falls back to the default for an invalid sort and direction" do
        tasks(:staff_training).update_column(:created_at, 1.day.from_now)

        get api_v1_tasks_path, params: { sort: "id; DROP TABLE tasks", direction: "sideways" }

        assert_response :ok
        assert_equal tasks(:staff_training).id, ordered_ids.first
      end

      test "index sorts by created_at ascending" do
        tasks(:staff_training).update_column(:created_at, 1.year.ago)

        get api_v1_tasks_path, params: { sort: "created_at", direction: "asc" }

        assert_equal tasks(:staff_training).id, ordered_ids.first
      end

      test "index sorts by priority ascending as low, medium, high" do
        get api_v1_tasks_path, params: { sort: "priority", direction: "asc" }

        assert_equal %w[low low medium medium medium high high], returned_priorities
      end

      test "index sorts by priority descending as high, medium, low" do
        get api_v1_tasks_path, params: { sort: "priority", direction: "desc" }

        assert_equal %w[high high medium medium medium low low], returned_priorities
      end

      test "index sorts by due_date ascending with empty dates last" do
        get api_v1_tasks_path, params: { sort: "due_date", direction: "asc" }

        assert_equal(
          ids_of(:complaint_log_close_out, :hmda_lar_review, :fair_lending_policy, :marketing_ad_review,
                 :staff_training, :cra_exam_prep, :section_1071_data_audit),
          ordered_ids
        )
      end

      test "index sorts by due_date descending with empty dates last" do
        get api_v1_tasks_path, params: { sort: "due_date", direction: "desc" }

        assert_equal(
          ids_of(:cra_exam_prep, :staff_training, :marketing_ad_review, :fair_lending_policy,
                 :hmda_lar_review, :complaint_log_close_out, :section_1071_data_audit),
          ordered_ids
        )
      end

      test "index sorts by title ignoring case" do
        Task.create!(title: "aaa lowercase first")

        get api_v1_tasks_path, params: { sort: "title", direction: "asc" }

        titles = response.parsed_body["data"].map { |task| task["title"] }

        assert_equal "aaa lowercase first", titles.first
        assert_equal titles.sort_by(&:downcase), titles
      end

      test "index keeps a stable order across pages when values tie" do
        insert_tasks(5)
        seen = (1..2).flat_map do |page|
          get api_v1_tasks_path, params: { sort: "priority", direction: "asc", per_page: 6, page: page }
          ordered_ids
        end

        assert_equal Task.count, seen.uniq.size
      end

      test "index uses the default pagination" do
        insert_tasks(20)

        get api_v1_tasks_path

        assert_equal 20, ordered_ids.size
        assert_equal({ "total" => 27, "page" => 1, "per_page" => 20, "total_pages" => 2 }, meta)
      end

      test "index returns the requested page" do
        get api_v1_tasks_path, params: { sort: "title", direction: "asc", per_page: 3, page: 3 }

        assert_equal 1, ordered_ids.size
        assert_equal({ "total" => 7, "page" => 3, "per_page" => 3, "total_pages" => 3 }, meta)
      end

      test "index limits per_page to 100" do
        insert_tasks(100)

        get api_v1_tasks_path, params: { per_page: 500 }

        assert_equal 100, ordered_ids.size
        assert_equal 100, meta["per_page"]
      end

      test "index raises per_page to at least 1" do
        [ "0", "-5" ].each do |value|
          get api_v1_tasks_path, params: { per_page: value }

          assert_equal 1, ordered_ids.size
          assert_equal 1, meta["per_page"]
        end
      end

      test "index uses the default for a non-numeric per_page" do
        [ "abc", "5abc", "1.5", "" ].each do |value|
          get api_v1_tasks_path, params: { per_page: value }

          assert_equal 20, meta["per_page"]
        end
      end

      test "index uses page 1 for an invalid page" do
        [ "abc", "0", "-1", "" ].each do |value|
          get api_v1_tasks_path, params: { page: value }

          assert_equal 1, meta["page"]
          assert_equal 7, ordered_ids.size
        end
      end

      test "index ignores array values in the sort and pagination params" do
        get "#{api_v1_tasks_path}?sort[]=title&direction[]=asc&page[]=2&per_page[]=2&overdue[]=true"

        assert_response :ok
        assert_equal({ "total" => 7, "page" => 1, "per_page" => 20, "total_pages" => 1 }, meta)
      end

      test "index returns no tasks for a page past the end" do
        [ "2", "99999999999999999999999" ].each do |value|
          get api_v1_tasks_path, params: { page: value }

          assert_response :ok
          assert_empty response.parsed_body["data"]
          assert_equal 7, meta["total"]
          assert_equal 1, meta["total_pages"]
        end
      end

      test "index counts only the tasks that match the filters" do
        get api_v1_tasks_path, params: { priority: "high", per_page: 1 }

        assert_equal 1, ordered_ids.size
        assert_equal({ "total" => 2, "page" => 1, "per_page" => 1, "total_pages" => 2 }, meta)
      end

      test "index returns an empty result when nothing matches" do
        get api_v1_tasks_path, params: { q: "no task has this title" }

        assert_response :ok
        assert_equal(
          { "data" => [], "meta" => { "total" => 0, "page" => 1, "per_page" => 20, "total_pages" => 0 } },
          response.parsed_body
        )
      end

      test "show returns the task" do
        task = tasks(:cra_exam_prep)

        get api_v1_task_path(task)

        assert_response :ok
        assert_equal task.id, response.parsed_body["id"]
        assert_equal task.title, response.parsed_body["title"]
      end

      test "show includes overdue" do
        get api_v1_task_path(tasks(:hmda_lar_review))

        assert_equal true, response.parsed_body["overdue"]
      end

      test "show returns 404 in JSON for a missing id" do
        get api_v1_task_path(MISSING_ID)

        assert_not_found_json
      end

      test "create with valid data returns 201 and saves the task" do
        assert_difference "Task.count", 1 do
          post api_v1_tasks_path, params: { task: { title: "File HMDA LAR", category: "hmda", priority: "high" } }, as: :json
        end

        assert_response :created
        assert_equal "File HMDA LAR", response.parsed_body["title"]
        assert_equal "hmda", response.parsed_body["category"]
      end

      test "create with invalid data returns 422 with errors by field" do
        assert_no_difference "Task.count" do
          post api_v1_tasks_path, params: { task: { title: "", status: "archived" } }, as: :json
        end

        assert_response :unprocessable_content
        assert_equal(
          {
            "errors" => {
              "title" => [ "can't be blank" ],
              "status" => [ "is not included in the list" ]
            }
          },
          response.parsed_body
        )
      end

      test "create with an invalid due_date returns 422 with the error on due_date" do
        [ "abc", 12345, true ].each do |value|
          assert_no_difference "Task.count" do
            post api_v1_tasks_path, params: { task: { title: "File HMDA LAR", due_date: value } }, as: :json
          end

          assert_response :unprocessable_content
          assert_equal({ "errors" => { "due_date" => [ "is not a valid date" ] } }, response.parsed_body)
        end
      end

      test "create accepts an empty or missing due_date" do
        [ { due_date: "" }, { due_date: nil }, {} ].each do |attributes|
          post api_v1_tasks_path, params: { task: { title: "File HMDA LAR", **attributes } }, as: :json

          assert_response :created
          assert_nil response.parsed_body["due_date"]
          assert_equal false, response.parsed_body["overdue"]
        end
      end

      test "update with valid data changes the task" do
        task = tasks(:cra_exam_prep)

        patch api_v1_task_path(task), params: { task: { title: "New title" } }, as: :json

        assert_response :ok
        assert_equal "New title", response.parsed_body["title"]
        assert_equal "New title", task.reload.title
      end

      test "update can complete a task" do
        task = tasks(:cra_exam_prep)

        patch api_v1_task_path(task), params: { task: { status: "completed" } }, as: :json

        assert_response :ok
        assert task.reload.completed?
      end

      test "update with invalid data returns 422 and keeps the task" do
        task = tasks(:cra_exam_prep)
        old_title = task.title

        patch api_v1_task_path(task), params: { task: { title: "" } }, as: :json

        assert_response :unprocessable_content
        assert_equal({ "errors" => { "title" => [ "can't be blank" ] } }, response.parsed_body)
        assert_equal old_title, task.reload.title
      end

      test "update with an invalid due_date returns 422 and keeps the date" do
        task = tasks(:cra_exam_prep)
        old_due_date = task.due_date

        patch api_v1_task_path(task), params: { task: { due_date: "abc" } }, as: :json

        assert_response :unprocessable_content
        assert_equal({ "errors" => { "due_date" => [ "is not a valid date" ] } }, response.parsed_body)
        assert_equal old_due_date, task.reload.due_date
      end

      test "update can clear the due_date" do
        task = tasks(:cra_exam_prep)

        patch api_v1_task_path(task), params: { task: { due_date: "" } }, as: :json

        assert_response :ok
        assert_nil task.reload.due_date
      end

      test "update returns 404 in JSON for a missing id" do
        patch api_v1_task_path(MISSING_ID), params: { task: { title: "New title" } }, as: :json

        assert_not_found_json
      end

      test "destroy returns 204 and removes the task" do
        task = tasks(:cra_exam_prep)

        assert_difference "Task.count", -1 do
          delete api_v1_task_path(task)
        end

        assert_response :no_content
        assert_empty response.body
      end

      test "destroy returns 404 in JSON for a missing id" do
        delete api_v1_task_path(MISSING_ID)

        assert_not_found_json
      end

      test "events returns the task history with the newest first" do
        get events_api_v1_task_path(tasks(:fair_lending_policy))

        assert_response :ok
        assert_equal [ "completed", "created" ], response.parsed_body.map { |event| event["event_type"] }
        assert_equal({ "status" => [ "pending", "completed" ] }, response.parsed_body.first["metadata"])
      end

      test "events returns 404 in JSON for a missing id" do
        get events_api_v1_task_path(MISSING_ID)

        assert_not_found_json
      end

      private

      def returned_ids
        ordered_ids.sort
      end

      def ordered_ids
        response.parsed_body["data"].map { |task| task["id"] }
      end

      def meta
        response.parsed_body["meta"]
      end

      def ids_of(*names)
        names.map { |name| tasks(name).id }
      end

      def insert_tasks(count)
        Task.insert_all(Array.new(count) { |index| { title: "Bulk task #{index}" } })
      end

      def returned_priorities
        response.parsed_body["data"].map { |task| task["priority"] }
      end

      def assert_returned_tasks(*names)
        assert_equal names.map { |name| tasks(name).id }.sort, returned_ids
      end

      def assert_not_found_json
        assert_response :not_found
        assert_equal({ "error" => "Not found" }, response.parsed_body)
      end
    end
  end
end
