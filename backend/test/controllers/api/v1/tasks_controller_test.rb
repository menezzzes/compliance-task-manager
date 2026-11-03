require "test_helper"

module Api
  module V1
    class TasksControllerTest < ActionDispatch::IntegrationTest
      MISSING_ID = 0

      # index

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

      # show

      test "show returns the task" do
        task = tasks(:cra_exam_prep)

        get api_v1_task_path(task)

        assert_response :ok
        assert_equal task.id, response.parsed_body["id"]
        assert_equal task.title, response.parsed_body["title"]
      end

      test "show returns 404 in JSON for a missing id" do
        get api_v1_task_path(MISSING_ID)

        assert_not_found_json
      end

      # create

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

      # update

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

      test "update returns 404 in JSON for a missing id" do
        patch api_v1_task_path(MISSING_ID), params: { task: { title: "New title" } }, as: :json

        assert_not_found_json
      end

      # destroy

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

      # events

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
        response.parsed_body.map { |task| task["id"] }.sort
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
