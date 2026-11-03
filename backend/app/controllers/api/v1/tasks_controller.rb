module Api
  module V1
    class TasksController < ApplicationController
      before_action :set_task, only: [ :show, :update, :destroy, :events ]

      def index
        tasks = Task.order(created_at: :desc)
        tasks = tasks.where(status: params[:status]) if Task.statuses.key?(params[:status])
        tasks = tasks.where(category: params[:category]) if Task.categories.key?(params[:category])
        tasks = tasks.where(priority: params[:priority]) if Task.priorities.key?(params[:priority])

        if params[:q].is_a?(String) && params[:q].present?
          tasks = tasks.where("title ILIKE ?", "%#{Task.sanitize_sql_like(params[:q])}%")
        end

        render json: tasks
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

      def task_params
        params.expect(task: [ :title, :description, :status, :priority, :category, :due_date ])
      end
    end
  end
end
