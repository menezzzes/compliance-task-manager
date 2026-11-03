module Api
  module V1
    class TasksController < ApplicationController
      DEFAULT_PER_PAGE = 20
      MAX_PER_PAGE = 100

      before_action :set_task, only: [ :show, :update, :destroy, :events ]

      def index
        tasks = filtered_tasks
        total = tasks.count
        page = page_param
        per_page = per_page_param
        total_pages = total.fdiv(per_page).ceil

        # A page past the end skips the query, so a huge page cannot overflow OFFSET.
        records =
          if page > total_pages
            []
          else
            tasks.sorted_by(params[:sort], params[:direction]).limit(per_page).offset((page - 1) * per_page)
          end

        render json: {
          data: records,
          meta: { total: total, page: page, per_page: per_page, total_pages: total_pages }
        }
      end

      def show
        render json: @task
      end

      def create
        task = Task.new(task_params)

        if task.save
          render json: task, status: :created
        else
          render json: { errors: task.errors }, status: :unprocessable_content
        end
      end

      def update
        if @task.update(task_params)
          render json: @task
        else
          render json: { errors: @task.errors }, status: :unprocessable_content
        end
      end

      def destroy
        @task.destroy!
        head :no_content
      end

      def events
        render json: @task.task_events.order(created_at: :desc)
      end

      private

      def set_task
        @task = Task.find(params[:id])
      end

      def filtered_tasks
        tasks = Task.all
        tasks = tasks.where(status: params[:status]) if Task.statuses.key?(params[:status])
        tasks = tasks.where(category: params[:category]) if Task.categories.key?(params[:category])
        tasks = tasks.where(priority: params[:priority]) if Task.priorities.key?(params[:priority])
        tasks = tasks.overdue if params[:overdue] == "true"

        if params[:q].is_a?(String) && params[:q].present?
          tasks = tasks.where("title ILIKE ?", "%#{Task.sanitize_sql_like(params[:q])}%")
        end

        tasks
      end

      def page_param
        page = integer_param(:page)
        page&.positive? ? page : 1
      end

      def per_page_param
        integer_param(:per_page)&.clamp(1, MAX_PER_PAGE) || DEFAULT_PER_PAGE
      end

      def integer_param(name)
        value = params[name]
        Integer(value, 10, exception: false) if value.is_a?(String)
      end

      def task_params
        params.expect(task: [ :title, :description, :status, :priority, :category, :due_date ])
      end
    end
  end
end
